// api/memory.js
// Vercel Serverless Function — Super Memory System via Firebase
// Menyimpan: chat history, project context, user preferences, AI notes

export const config = { runtime: 'edge' };

const FIREBASE_BASE = (projectId) =>
  `https://${projectId}-default-rtdb.firebaseio.com`;

async function fbGet(projectId, path) {
  const res = await fetch(`${FIREBASE_BASE(projectId)}${path}.json`);
  if (!res.ok) throw new Error(`Firebase GET error: ${res.status}`);
  return res.json();
}

async function fbSet(projectId, path, data) {
  const res = await fetch(`${FIREBASE_BASE(projectId)}${path}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Firebase SET error: ${res.status}`);
  return res.json();
}

async function fbPush(projectId, path, data) {
  const res = await fetch(`${FIREBASE_BASE(projectId)}${path}.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Firebase PUSH error: ${res.status}`);
  return res.json();
}

async function fbDelete(projectId, path) {
  const res = await fetch(`${FIREBASE_BASE(projectId)}${path}.json`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Firebase DELETE error: ${res.status}`);
  return res.json();
}

export default async function handler(req) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    return new Response(JSON.stringify({ error: 'FIREBASE_PROJECT_ID missing' }), { status: 500 });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'get';
  const sessionId = url.searchParams.get('session') || 'default';

  const cors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  try {
    const body = req.method !== 'GET' ? await req.json().catch(() => ({})) : {};

    // ════════════════════════════════
    // GET FULL MEMORY — Ambil semua memori untuk session
    // ════════════════════════════════
    if (action === 'get') {
      const memory = await fbGet(projectId, `/forge/memory/${sessionId}`);
      return new Response(JSON.stringify({ memory: memory || {} }), { status: 200, headers: cors });
    }

    // ════════════════════════════════
    // SAVE MESSAGE — Simpan satu pesan ke history
    // ════════════════════════════════
    if (action === 'save_message') {
      const { role, content, metadata = {} } = body;
      const message = {
        role,
        content,
        metadata,
        timestamp: new Date().toISOString()
      };

      // Push ke history
      const pushRes = await fbPush(projectId, `/forge/memory/${sessionId}/history`, message);

      // Update last active
      await fbSet(projectId, `/forge/memory/${sessionId}/lastActive`, new Date().toISOString());

      // Update message count
      const stats = await fbGet(projectId, `/forge/memory/${sessionId}/stats`) || {};
      await fbSet(projectId, `/forge/memory/${sessionId}/stats`, {
        ...stats,
        messageCount: (stats.messageCount || 0) + 1,
        lastRole: role
      });

      return new Response(JSON.stringify({ success: true, id: pushRes.name }), { status: 200, headers: cors });
    }

    // ════════════════════════════════
    // GET HISTORY — Ambil chat history (dengan limit)
    // ════════════════════════════════
    if (action === 'get_history') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const rawHistory = await fbGet(projectId, `/forge/memory/${sessionId}/history`);

      let history = rawHistory
        ? Object.entries(rawHistory).map(([k, v]) => ({ id: k, ...v }))
        : [];

      // Sort by timestamp, ambil N terakhir
      history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      if (history.length > limit) history = history.slice(-limit);

      return new Response(JSON.stringify({ history, count: history.length }), { status: 200, headers: cors });
    }

    // ════════════════════════════════
    // UPDATE PROJECT CONTEXT — Simpan konteks project Godot
    // ════════════════════════════════
    if (action === 'update_context') {
      const { projectName, godotVersion, files = [], settings = {} } = body;
      const context = {
        projectName,
        godotVersion: godotVersion || '4.x',
        files,
        settings,
        updatedAt: new Date().toISOString()
      };
      await fbSet(projectId, `/forge/memory/${sessionId}/projectContext`, context);
      return new Response(JSON.stringify({ success: true, context }), { status: 200, headers: cors });
    }

    // ════════════════════════════════
    // SAVE NOTE — Simpan catatan penting AI
    // ════════════════════════════════
    if (action === 'save_note') {
      const { note, category = 'general', tags = [] } = body;
      const noteData = {
        note,
        category,
        tags,
        timestamp: new Date().toISOString()
      };
      const res = await fbPush(projectId, `/forge/memory/${sessionId}/notes`, noteData);
      return new Response(JSON.stringify({ success: true, id: res.name }), { status: 200, headers: cors });
    }

    // ════════════════════════════════
    // SAVE PREFERENCE — Simpan preferensi user
    // ════════════════════════════════
    if (action === 'save_preference') {
      const { key, value } = body;
      await fbSet(projectId, `/forge/memory/${sessionId}/preferences/${key}`, value);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: cors });
    }

    // ════════════════════════════════
    // GET SUMMARY — Ringkasan memori untuk AI context
    // ════════════════════════════════
    if (action === 'get_summary') {
      const memory = await fbGet(projectId, `/forge/memory/${sessionId}`);
      if (!memory) return new Response(JSON.stringify({ summary: null }), { status: 200, headers: cors });

      const historyArr = memory.history
        ? Object.values(memory.history)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .slice(-20)
        : [];

      const notesArr = memory.notes
        ? Object.values(memory.notes).slice(-10)
        : [];

      const summary = {
        sessionId,
        projectContext: memory.projectContext || null,
        recentMessages: historyArr,
        importantNotes: notesArr,
        preferences: memory.preferences || {},
        stats: memory.stats || {},
        lastActive: memory.lastActive || null
      };

      return new Response(JSON.stringify({ summary }), { status: 200, headers: cors });
    }

    // ════════════════════════════════
    // CLEAR HISTORY — Hapus chat history (bukan konteks)
    // ════════════════════════════════
    if (action === 'clear_history') {
      await fbDelete(projectId, `/forge/memory/${sessionId}/history`);
      await fbSet(projectId, `/forge/memory/${sessionId}/stats/messageCount`, 0);
      return new Response(JSON.stringify({ success: true, cleared: 'history' }), { status: 200, headers: cors });
    }

    // ════════════════════════════════
    // CLEAR ALL — Reset semua memori session
    // ════════════════════════════════
    if (action === 'clear_all') {
      await fbDelete(projectId, `/forge/memory/${sessionId}`);
      return new Response(JSON.stringify({ success: true, cleared: 'all' }), { status: 200, headers: cors });
    }

    // ════════════════════════════════
    // LIST SESSIONS — Daftar semua session
    // ════════════════════════════════
    if (action === 'list_sessions') {
      const allMemory = await fbGet(projectId, '/forge/memory');
      const sessions = allMemory
        ? Object.entries(allMemory).map(([id, data]) => ({
            id,
            projectName: data.projectContext?.projectName || 'Untitled',
            lastActive: data.lastActive || null,
            messageCount: data.stats?.messageCount || 0
          }))
        : [];
      sessions.sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));
      return new Response(JSON.stringify({ sessions }), { status: 200, headers: cors });
    }

    return new Response(JSON.stringify({ error: `Action '${action}' tidak dikenal` }), { status: 400, headers: cors });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
