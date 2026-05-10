// api/generate.js
// Vercel Serverless Function — Godot Code Generator
// Generate GDScript, scene, shader, config files dengan AI

export const config = { runtime: 'edge' };

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const GODOT_SYSTEM_PROMPT = `Kamu adalah FORGE Generator — AI spesialis Godot 4.x code generation.

Tugasmu adalah menghasilkan kode/file Godot yang:
- 100% valid dan langsung bisa dipakai
- Mengikuti best practices Godot 4.x (GDScript 2.0)
- Punya komentar yang jelas dan informatif
- Handling error yang baik
- Performa yang optimal

Tipe file yang bisa kamu buat:
- GDScript (.gd) — script untuk Node, Resource, autoload
- Scene (.tscn) — scene file dalam format text
- Shader (.gdshader) — visual shader
- Resource (.tres) — custom resource
- Config (.cfg) — konfigurasi project
- JSON (.json) — data file

Format output WAJIB:
Selalu gunakan format ini untuk setiap file:
=== FILE: path/nama_file.ekstensi ===
[isi file]
=== END FILE ===

Jika ada beberapa file, pisahkan dengan format yang sama.
Setelah semua file, tambahkan:
=== EXPLANATION ===
[penjelasan singkat apa yang dibuat dan cara pakainya]
=== END EXPLANATION ===`;

// ── Template presets untuk quick generate ──
const PRESETS = {
  player_controller: {
    name: 'Player Controller',
    prompt: 'Buat player controller 2D lengkap dengan movement, jump, dash, dan animasi state machine'
  },
  enemy_ai: {
    name: 'Enemy AI',
    prompt: 'Buat enemy AI dengan patrol, chase player, attack, dan health system'
  },
  inventory: {
    name: 'Inventory System',
    prompt: 'Buat inventory system dengan add/remove/use item, stack support, dan UI'
  },
  save_system: {
    name: 'Save System',
    prompt: 'Buat save/load system menggunakan JSON dengan multiple save slots'
  },
  dialogue: {
    name: 'Dialogue System',
    prompt: 'Buat dialogue system dengan NPC conversation, choices, dan typewriter effect'
  },
  camera_2d: {
    name: 'Camera 2D',
    prompt: 'Buat Camera2D dengan smooth follow, room bounds, shake effect, dan zoom'
  },
  health_system: {
    name: 'Health System',
    prompt: 'Buat health system dengan damage, healing, invincibility frames, dan death'
  },
  state_machine: {
    name: 'State Machine',
    prompt: 'Buat finite state machine (FSM) yang bisa dipakai untuk player, enemy, atau object apapun'
  },
  singleton: {
    name: 'Game Manager Singleton',
    prompt: 'Buat GameManager autoload singleton untuk manage game state, score, level, dan events'
  },
  shader_basic: {
    name: 'Basic Shaders',
    prompt: 'Buat kumpulan shader dasar: outline, flash, dissolve, dan pixelate'
  }
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  const geminiKey = process.env.VITE_GEMINI_API_KEY;
  const cors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  if (!geminiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY missing' }), { status: 500, headers: cors });
  }

  // ── GET: Ambil daftar presets ──
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'presets') {
      return new Response(JSON.stringify({
        presets: Object.entries(PRESETS).map(([id, p]) => ({ id, ...p }))
      }), { status: 200, headers: cors });
    }

    return new Response(JSON.stringify({ status: 'FORGE Generator ready', version: '1.0.0' }), {
      status: 200, headers: cors
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors });
  }

  try {
    const {
      prompt,
      preset = null,
      fileType = 'gdscript',
      projectContext = null,
      outputPath = null,
      options = {}
    } = await req.json();

    // Resolve preset atau custom prompt
    let finalPrompt = prompt;
    if (preset && PRESETS[preset]) {
      finalPrompt = PRESETS[preset].prompt;
      if (prompt) finalPrompt += `\n\nTambahan requirement: ${prompt}`;
    }

    if (!finalPrompt?.trim()) {
      return new Response(JSON.stringify({ error: 'Prompt atau preset wajib diisi' }), { status: 400, headers: cors });
    }

    // ── Build context ──
    const contextStr = projectContext
      ? `\nKonteks project:\n- Nama: ${projectContext.projectName || 'Unknown'}\n- Godot: ${projectContext.godotVersion || '4.x'}\n- File yang ada: ${(projectContext.files || []).join(', ') || 'tidak ada'}`
      : '';

    const fileTypeGuide = {
      gdscript: 'Gunakan GDScript 2.0 (Godot 4.x). Pakai static typing sebisa mungkin.',
      scene: 'Generate file .tscn dalam format Godot PackedScene text.',
      shader: 'Generate file .gdshader dengan syntax Godot shader language.',
      resource: 'Generate file .tres sebagai custom resource.',
      json: 'Generate file .json yang valid.',
      multi: 'Generate semua file yang diperlukan (bisa lebih dari satu).'
    };

    const userPrompt = `${contextStr ? contextStr + '\n\n' : ''}Tipe output: ${fileType}
${fileTypeGuide[fileType] || fileTypeGuide.gdscript}
${outputPath ? `Path target: ${outputPath}` : ''}
${options.godotVersion ? `Godot version: ${options.godotVersion}` : 'Godot version: 4.x'}
${options.style ? `Code style: ${options.style}` : ''}

TUGAS:
${finalPrompt}

Ingat: Output harus menggunakan format === FILE: ... === yang benar.`;

    // ── Call Gemini ──
    const geminiRes = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: GODOT_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.35,
          topP: 0.95,
          maxOutputTokens: 8192
        }
      })
    });

    if (!geminiRes.ok) {
      return new Response(JSON.stringify({ error: `Gemini error: ${await geminiRes.text()}` }), {
        status: 502, headers: cors
      });
    }

    const geminiData = await geminiRes.json();
    const rawOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // ── Parse file blocks ──
    const files = [];
    const fileRegex = /=== FILE: (.+?) ===\n([\s\S]+?)\n=== END FILE ===/g;
    let match;
    while ((match = fileRegex.exec(rawOutput)) !== null) {
      const filePath = match[1].trim();
      const content = match[2].trim();
      const ext = filePath.split('.').pop();
      const langMap = { gd: 'gdscript', tscn: 'godot-scene', tres: 'godot-resource', gdshader: 'glsl', json: 'json', cfg: 'ini' };

      files.push({
        path: filePath,
        content,
        language: langMap[ext] || 'text',
        size: content.length
      });
    }

    // ── Parse explanation ──
    const explanationMatch = rawOutput.match(/=== EXPLANATION ===([\s\S]+?)=== END EXPLANATION ===/);
    const explanation = explanationMatch ? explanationMatch[1].trim() : null;

    // Fallback: kalau tidak ada format, return raw sebagai satu file
    if (files.length === 0 && rawOutput.length > 0) {
      const ext = fileType === 'shader' ? 'gdshader' : fileType === 'scene' ? 'tscn' : 'gd';
      files.push({
        path: outputPath || `generated/output.${ext}`,
        content: rawOutput,
        language: fileType === 'gdscript' ? 'gdscript' : 'text',
        size: rawOutput.length
      });
    }

    return new Response(JSON.stringify({
      success: true,
      files,
      explanation,
      preset: preset || null,
      prompt: finalPrompt,
      fileCount: files.length,
      totalSize: files.reduce((s, f) => s + f.size, 0),
      timestamp: new Date().toISOString()
    }), { status: 200, headers: cors });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
                                                                              }
      
