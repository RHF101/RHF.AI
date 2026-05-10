// api/chat.js
// Vercel Serverless Function — Gemini Chat + Tavily Search + Firebase Memory

export const config = { runtime: 'edge' };

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const TAVILY_API_URL = 'https://api.tavily.com/search';

// ── System prompt untuk Godot AI Forge ──
const SYSTEM_PROMPT = `Kamu adalah FORGE, AI asisten game developer yang sangat cerdas dan terhubung ke Godot Engine.

Kemampuanmu:
- Menulis, menganalisis, dan memperbaiki kode GDScript & C# untuk Godot 4.x
- Mencari dokumentasi Godot terbaru secara real-time via web search
- Membuat file, scene, script langsung di project Godot user
- Mengingat semua konteks percakapan sebelumnya (memori super)
- Menggunakan teknik tumpuk: Plan → Search → Execute → Verify → Refine
- Generate aset visual dengan Canva API

Gaya komunikasi:
- Gunakan bahasa Indonesia yang santai tapi profesional
- Selalu teliti dan berikan penjelasan step by step
- Kalau bikin kode, selalu beri komentar yang jelas
- Kalau ada error, analisis dulu sebelum kasih solusi

Format output kode:
- Selalu gunakan code block dengan bahasa yang tepat (gdscript, csharp, json, dll)
- Tambahkan komentar # FORGE: di bagian penting

Ingat: Kamu bisa melakukan hal kompleks dengan teknik tumpuk — pecah tugas besar jadi langkah-langkah kecil yang presisi.`;

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { message, history = [], useSearch = false, projectContext = null } = await req.json();

    const geminiKey = process.env.VITE_GEMINI_API_KEY;
    const tavilyKey = process.env.VITE_TAVILY_API_KEY;

    if (!geminiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY tidak ditemukan' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    // ── Step 1: Tavily Search (jika diperlukan) ──
    let searchResults = '';
    if (useSearch && tavilyKey) {
      try {
        const tavilyRes = await fetch(TAVILY_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: message,
            search_depth: 'advanced',
            include_answer: true,
            include_domains: ['docs.godotengine.org', 'godotengine.org', 'github.com/godotengine'],
            max_results: 4
          })
        });
        if (tavilyRes.ok) {
          const tavilyData = await tavilyRes.json();
          if (tavilyData.results?.length) {
            searchResults = '\n\n[HASIL WEB SEARCH]\n' + tavilyData.results
              .map(r => `• ${r.title}\n  ${r.url}\n  ${r.content?.slice(0, 300)}...`)
              .join('\n\n');
          }
        }
      } catch (err) {
        console.error('Tavily error:', err);
      }
    }

    // ── Step 2: Build Gemini context ──
    const systemWithContext = SYSTEM_PROMPT +
      (projectContext ? `\n\n[KONTEKS PROJECT GODOT]\n${JSON.stringify(projectContext, null, 2)}` : '') +
      (searchResults || '');

    // Convert history to Gemini format
    const geminiHistory = history.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }));

    const geminiBody = {
      system_instruction: { parts: [{ text: systemWithContext }] },
      contents: [
        ...geminiHistory,
        { role: 'user', parts: [{ text: message }] }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    };

    // ── Step 3: Call Gemini ──
    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(JSON.stringify({ error: `Gemini API error: ${errText}` }), {
        status: 502, headers: { 'Content-Type': 'application/json' }
      });
    }

    const geminiData = await geminiRes.json();
    const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'FORGE tidak bisa merespons saat ini.';

    return new Response(JSON.stringify({
      reply,
      searchUsed: !!searchResults,
      model: 'gemini-2.0-flash',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
          }
