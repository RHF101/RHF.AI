// api/chain.js
// Vercel Serverless Function — Teknik Tumpuk (Multi-Step AI Chain Engine)
// Plan → Search → Execute → Verify → Refine

export const config = { runtime: 'edge' };

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const TAVILY_URL = 'https://api.tavily.com/search';

// ── Helper: Call Gemini ──
async function callGemini(apiKey, systemPrompt, userPrompt, temperature = 0.3) {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature, maxOutputTokens: 8192, topP: 0.95 }
    })
  });
  if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── Helper: Tavily Search ──
async function searchWeb(apiKey, query) {
  try {
    const res = await fetch(TAVILY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced',
        include_answer: true,
        include_domains: ['docs.godotengine.org', 'godotengine.org', 'github.com'],
        max_results: 3
      })
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.results?.map(r => `${r.title}: ${r.content?.slice(0, 400)}`).join('\n') || '';
  } catch { return ''; }
}

// ── Helper: Parse JSON safely ──
function safeJson(text) {
  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch { return null; }
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const geminiKey = process.env.VITE_GEMINI_API_KEY;
  const tavilyKey = process.env.VITE_TAVILY_API_KEY;

  if (!geminiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY missing' }), { status: 500 });
  }

  try {
    const { task, projectContext = null, maxSteps = 5 } = await req.json();
    const steps = [];

    // ════════════════════════════════
    // STEP 1: PLAN — Pecah tugas jadi langkah-langkah
    // ════════════════════════════════
    const planPrompt = `Kamu adalah planner AI untuk Godot game development.
Tugasmu adalah memecah tugas kompleks menjadi langkah-langkah kecil yang konkret dan bisa dieksekusi.

Konteks project: ${projectContext ? JSON.stringify(projectContext) : 'tidak ada'}

Tugas: "${task}"

Buat rencana dalam format JSON:
{
  "summary": "ringkasan singkat tugas",
  "needsSearch": true/false,
  "searchQuery": "query pencarian jika perlu",
  "steps": [
    {
      "id": 1,
      "action": "nama aksi",
      "description": "apa yang dilakukan",
      "type": "create_file|edit_file|delete_file|generate_code|explain|search"
    }
  ],
  "estimatedFiles": ["daftar file yang akan dibuat/diedit"]
}

Hanya balas dengan JSON, tidak ada teks lain.`;

    const planRaw = await callGemini(geminiKey, 'Kamu adalah AI planner presisi untuk Godot.', planPrompt, 0.2);
    const plan = safeJson(planRaw);

    steps.push({
      phase: 'PLAN',
      icon: '📋',
      label: 'Membuat rencana',
      result: plan || { summary: task, steps: [] },
      raw: planRaw
    });

    // ════════════════════════════════
    // STEP 2: SEARCH — Cari info terbaru jika perlu
    // ════════════════════════════════
    let searchContext = '';
    if (plan?.needsSearch && tavilyKey) {
      const query = plan.searchQuery || task;
      searchContext = await searchWeb(tavilyKey, query);
      steps.push({
        phase: 'SEARCH',
        icon: '🔍',
        label: 'Mencari dokumentasi',
        query,
        result: searchContext ? 'Ditemukan referensi relevan' : 'Tidak ada hasil'
      });
    }

    // ════════════════════════════════
    // STEP 3: EXECUTE — Generate semua file/code
    // ════════════════════════════════
    const executePrompt = `Kamu adalah Godot expert AI. Eksekusi tugas berikut dengan presisi tinggi.

TUGAS: ${task}

RENCANA:
${JSON.stringify(plan, null, 2)}

${searchContext ? `REFERENSI DARI WEB:\n${searchContext}` : ''}

${projectContext ? `KONTEKS PROJECT:\n${JSON.stringify(projectContext, null, 2)}` : ''}

Hasilkan SEMUA file dan kode yang dibutuhkan. Format output:
Untuk setiap file, gunakan format:
=== FILE: path/nama_file.gd ===
[isi file lengkap]
=== END FILE ===

Pastikan:
- Kode GDScript valid untuk Godot 4.x
- Setiap file lengkap dan bisa langsung dipakai
- Tambahkan komentar # FORGE: pada bagian penting
- Kalau ada error yang mungkin terjadi, tambahkan penanganan error`;

    const executeRaw = await callGemini(geminiKey,
      'Kamu adalah Godot 4.x expert. Tulis kode yang bersih, efisien, dan production-ready.',
      executePrompt, 0.4
    );

    // Parse file blocks dari output
    const fileBlocks = [];
    const fileRegex = /=== FILE: (.+?) ===\n([\s\S]+?)\n=== END FILE ===/g;
    let match;
    while ((match = fileRegex.exec(executeRaw)) !== null) {
      fileBlocks.push({ path: match[1].trim(), content: match[2].trim() });
    }

    steps.push({
      phase: 'EXECUTE',
      icon: '⚡',
      label: 'Mengeksekusi & membuat file',
      files: fileBlocks,
      rawResponse: executeRaw
    });

    // ════════════════════════════════
    // STEP 4: VERIFY — Cek hasil eksekusi
    // ════════════════════════════════
    const verifyPrompt = `Review kode GDScript berikut untuk Godot 4.x.
Cari bug, error, atau hal yang bisa diperbaiki.

KODE YANG DIHASILKAN:
${executeRaw.slice(0, 4000)}

Balas dalam format JSON:
{
  "isValid": true/false,
  "issues": ["list masalah jika ada"],
  "suggestions": ["saran perbaikan"],
  "qualityScore": 1-10,
  "summary": "ringkasan review"
}

Hanya balas JSON.`;

    const verifyRaw = await callGemini(geminiKey,
      'Kamu adalah Godot code reviewer yang ketat dan teliti.',
      verifyPrompt, 0.1
    );
    const verification = safeJson(verifyRaw);

    steps.push({
      phase: 'VERIFY',
      icon: '✅',
      label: 'Verifikasi kualitas',
      result: verification || { isValid: true, summary: 'Kode sudah diverifikasi' }
    });

    // ════════════════════════════════
    // STEP 5: REFINE — Perbaiki jika perlu
    // ════════════════════════════════
    let finalCode = executeRaw;
    if (verification && !verification.isValid && verification.issues?.length > 0) {
      const refinePrompt = `Perbaiki kode berikut berdasarkan hasil review:

KODE ASLI:
${executeRaw.slice(0, 3000)}

MASALAH YANG DITEMUKAN:
${verification.issues?.join('\n')}

SARAN PERBAIKAN:
${verification.suggestions?.join('\n')}

Hasilkan kode yang sudah diperbaiki dengan format yang sama (=== FILE: ... ===).`;

      finalCode = await callGemini(geminiKey,
        'Kamu adalah Godot expert yang sedang memperbaiki kode.',
        refinePrompt, 0.3
      );

      // Re-parse file blocks
      const refinedFiles = [];
      let m2;
      while ((m2 = fileRegex.exec(finalCode)) !== null) {
        refinedFiles.push({ path: m2[1].trim(), content: m2[2].trim() });
      }
      if (refinedFiles.length > 0) {
        steps[steps.length - 2].files = refinedFiles;
      }
    }

    steps.push({
      phase: 'REFINE',
      icon: '🔧',
      label: 'Finalisasi output',
      refined: !verification?.isValid,
      result: 'Selesai'
    });

    // ── Kumpulkan semua file hasil ──
    const allFiles = [];
    const seenPaths = new Set();
    for (const step of steps) {
      if (step.files) {
        for (const f of step.files) {
          if (!seenPaths.has(f.path)) {
            seenPaths.add(f.path);
            allFiles.push(f);
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      task,
      steps,
      files: allFiles,
      verification,
      summary: plan?.summary || task,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
  
