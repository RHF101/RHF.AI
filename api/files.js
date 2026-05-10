// api/files.js
// Vercel Serverless Function — Godot File Manager
// Operasi: list, create, read, update, delete file via Firebase

export const config = { runtime: 'edge' };

const FIREBASE_BASE = (projectId) =>
  `https://${projectId}-default-rtdb.firebaseio.com`;

// ── Helper: Firebase REST call ──
async function firebaseRequest(projectId, path, method = 'GET', body = null) {
  const url = `${FIREBASE_BASE(projectId)}${path}.json`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body !== null) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`Firebase error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Helper: Validate file path ──
function validatePath(filePath) {
  if (!filePath) return 'Path tidak boleh kosong';
  if (filePath.includes('..')) return 'Path tidak boleh mengandung ..';
  if (!filePath.match(/^[a-zA-Z0-9_\-/.]+$/)) return 'Karakter path tidak valid';
  const allowed = ['.gd', '.tscn', '.tres', '.gdshader', '.json', '.cfg', '.txt', '.md', '.cs', '.glsl'];
  const ext = '.' + filePath.split('.').pop();
  if (!allowed.includes(ext)) return `Ekstensi ${ext} tidak diizinkan`;
  return null;
}

// ── Helper: Firebase path encoding (no dots/slashes in keys) ──
function encodeFirebasePath(p) {
  return p.replace(/\./g, '__dot__').replace(/\//g, '__slash__');
}
function decodeFirebasePath(p) {
  return p.replace(/__dot__/g, '.').replace(/__slash__/g, '/');
}

export default async function handler(req) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;

  if (!projectId) {
    return new Response(JSON.stringify({ error: 'FIREBASE_PROJECT_ID missing' }), { status: 500 });
  }

  // CORS preflight
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
  const action = url.searchParams.get('action') || 'list';

  try {
    // ════════════════════════════════
    // LIST — Ambil semua file
    // ════════════════════════════════
    if (req.method === 'GET' && action === 'list') {
      const data = await firebaseRequest(projectId, '/forge/files');
      const files = data
        ? Object.entries(data).map(([key, val]) => ({
            id: key,
            path: decodeFirebasePath(key),
            ...val
          }))
        : [];
      return new Response(JSON.stringify({ files }), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const body = req.method !== 'GET' ? await req.json() : {};

    // ════════════════════════════════
    // CREATE / UPDATE — Buat atau simpan file
    // ════════════════════════════════
    if ((req.method === 'POST' || req.method === 'PUT') && action !== 'delete') {
      const { path: filePath, content, language = 'gdscript', description = '' } = body;

      const validErr = validatePath(filePath);
      if (validErr) {
        return new Response(JSON.stringify({ error: validErr }), { status: 400 });
      }

      const key = encodeFirebasePath(filePath);
      const fileData = {
        path: filePath,
        content,
        language,
        description,
        size: content?.length || 0,
        createdAt: body.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: (body.version || 0) + 1
      };

      await firebaseRequest(projectId, `/forge/files/${key}`, 'PUT', fileData);

      // Log ke activity feed
      const activityKey = `act_${Date.now()}`;
      await firebaseRequest(projectId, `/forge/activity/${activityKey}`, 'PUT', {
        type: req.method === 'POST' ? 'file_created' : 'file_updated',
        path: filePath,
        timestamp: new Date().toISOString(),
        size: fileData.size
      });

      return new Response(JSON.stringify({ success: true, file: fileData }), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // ════════════════════════════════
    // READ — Baca isi satu file
    // ════════════════════════════════
    if (req.method === 'GET' && action === 'read') {
      const filePath = url.searchParams.get('path');
      const validErr = validatePath(filePath);
      if (validErr) return new Response(JSON.stringify({ error: validErr }), { status: 400 });

      const key = encodeFirebasePath(filePath);
      const fileData = await firebaseRequest(projectId, `/forge/files/${key}`);

      if (!fileData) {
        return new Response(JSON.stringify({ error: 'File tidak ditemukan' }), { status: 404 });
      }

      return new Response(JSON.stringify({ file: fileData }), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // ════════════════════════════════
    // DELETE — Hapus file
    // ════════════════════════════════
    if (req.method === 'DELETE' || action === 'delete') {
      const filePath = body.path || url.searchParams.get('path');
      const validErr = validatePath(filePath);
      if (validErr) return new Response(JSON.stringify({ error: validErr }), { status: 400 });

      const key = encodeFirebasePath(filePath);

      // Backup dulu sebelum hapus
      const existing = await firebaseRequest(projectId, `/forge/files/${key}`);
      if (existing) {
        const trashKey = `trash_${Date.now()}_${key}`;
        await firebaseRequest(projectId, `/forge/trash/${trashKey}`, 'PUT', {
          ...existing,
          deletedAt: new Date().toISOString()
        });
      }

      await firebaseRequest(projectId, `/forge/files/${key}`, 'DELETE');

      // Log activity
      const actKey = `act_${Date.now()}`;
      await firebaseRequest(projectId, `/forge/activity/${actKey}`, 'PUT', {
        type: 'file_deleted',
        path: filePath,
        timestamp: new Date().toISOString()
      });

      return new Response(JSON.stringify({ success: true, deleted: filePath }), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // ════════════════════════════════
    // BULK CREATE — Buat banyak file sekaligus (dari chain engine)
    // ════════════════════════════════
    if (req.method === 'POST' && action === 'bulk') {
      const { files } = body;
      if (!Array.isArray(files) || files.length === 0) {
        return new Response(JSON.stringify({ error: 'Files array kosong' }), { status: 400 });
      }

      const results = [];
      for (const file of files) {
        const validErr = validatePath(file.path);
        if (validErr) {
          results.push({ path: file.path, success: false, error: validErr });
          continue;
        }
        const key = encodeFirebasePath(file.path);
        const fileData = {
          path: file.path,
          content: file.content,
          language: file.language || 'gdscript',
          description: file.description || '',
          size: file.content?.length || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1
        };
        await firebaseRequest(projectId, `/forge/files/${key}`, 'PUT', fileData);
        results.push({ path: file.path, success: true });
      }

      return new Response(JSON.stringify({ success: true, results }), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response(JSON.stringify({ error: 'Action tidak dikenal' }), { status: 400 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
