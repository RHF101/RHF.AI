// api/search.js
// Vercel Serverless Function — Tavily Web Search
// Khusus untuk cari dokumentasi Godot, tutorial, error fix

export const config = { runtime: 'edge' };

const TAVILY_URL = 'https://api.tavily.com/search';

// Domain prioritas untuk Godot development
const GODOT_DOMAINS = [
  'docs.godotengine.org',
  'godotengine.org',
  'github.com/godotengine',
  'godotforums.org',
  'reddit.com/r/godot',
  'gdquest.com',
  'kidscancode.org'
];

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const tavilyKey = process.env.VITE_TAVILY_API_KEY;
  const cors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  if (!tavilyKey) {
    return new Response(JSON.stringify({ error: 'TAVILY_API_KEY missing' }), { status: 500, headers: cors });
  }

  try {
    const {
      query,
      mode = 'godot',       // 'godot' | 'general' | 'code'
      maxResults = 5,
      includeAnswer = true,
      depth = 'advanced'    // 'basic' | 'advanced'
    } = await req.json();

    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: 'Query wajib diisi' }), { status: 400, headers: cors });
    }

    // ── Build query berdasarkan mode ──
    let enhancedQuery = query;
    let includeDomains = null;

    if (mode === 'godot') {
      // Tambah konteks Godot jika belum ada
      if (!query.toLowerCase().includes('godot')) {
        enhancedQuery = `Godot 4 ${query}`;
      }
      includeDomains = GODOT_DOMAINS;
    } else if (mode === 'code') {
      enhancedQuery = `${query} code example tutorial`;
    }

    const tavilyBody = {
      api_key: tavilyKey,
      query: enhancedQuery,
      search_depth: depth,
      include_answer: includeAnswer,
      include_raw_content: false,
      max_results: Math.min(maxResults, 10)
    };

    if (includeDomains) {
      tavilyBody.include_domains = includeDomains;
    }

    const res = await fetch(TAVILY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tavilyBody)
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: `Tavily error: ${errText}` }), { status: 502, headers: cors });
    }

    const data = await res.json();

    // ── Format hasil ──
    const results = (data.results || []).map(r => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
      domain: new URL(r.url).hostname
    }));

    return new Response(JSON.stringify({
      query: enhancedQuery,
      originalQuery: query,
      answer: data.answer || null,
      results,
      count: results.length,
      mode,
      timestamp: new Date().toISOString()
    }), { status: 200, headers: cors });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
