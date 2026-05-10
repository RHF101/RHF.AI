// api/image.js
// Vercel Serverless Function — Canva API Image Generation
// Generate asset visual untuk Godot game (sprite, UI, background, dll)

export const config = { runtime: 'edge' };

const CANVA_API_BASE = 'https://api.canva.com/rest/v1';

// ── Helper: Get Canva Access Token ──
async function getCanvaToken(publicKey, kid) {
  // Canva pakai JWT-based auth dengan private key
  // Di sini kita pakai API key langsung untuk simplicity
  // Production: implement proper JWT signing
  return `${publicKey}:${kid}`;
}

// ── Game asset templates per type ──
const ASSET_TEMPLATES = {
  sprite: {
    width: 256, height: 256,
    description: 'Game sprite character/object',
    style: 'pixel art, clean edges, transparent background'
  },
  background: {
    width: 1920, height: 1080,
    description: 'Game background scene',
    style: 'detailed, atmospheric, game background'
  },
  ui: {
    width: 512, height: 512,
    description: 'Game UI element',
    style: 'clean, minimal, game UI, vector-like'
  },
  icon: {
    width: 128, height: 128,
    description: 'Game icon/item',
    style: 'pixel art icon, clear, small scale'
  },
  tileset: {
    width: 512, height: 512,
    description: 'Game tileset',
    style: 'tileable, consistent style, game tiles'
  },
  logo: {
    width: 800, height: 400,
    description: 'Game logo/title',
    style: 'bold, striking, game title style'
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

  const canvaPublicKey = process.env.VITE_CANVA_PUBLIC_KEY;
  const canvaKid = process.env.VITE_CANVA_KID;
  const cors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  if (!canvaPublicKey || !canvaKid) {
    return new Response(JSON.stringify({ error: 'CANVA credentials missing' }), { status: 500, headers: cors });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'generate';

  try {
    // ════════════════════════════════
    // GENERATE — Buat image baru dengan Canva
    // ════════════════════════════════
    if (req.method === 'POST' && action === 'generate') {
      const {
        prompt,
        assetType = 'sprite',
        gameStyle = 'pixel art',
        colorPalette = null,
        width = null,
        height = null
      } = await req.json();

      if (!prompt) {
        return new Response(JSON.stringify({ error: 'Prompt wajib diisi' }), { status: 400, headers: cors });
      }

      const template = ASSET_TEMPLATES[assetType] || ASSET_TEMPLATES.sprite;
      const finalWidth = width || template.width;
      const finalHeight = height || template.height;

      // Build enhanced prompt untuk game assets
      const enhancedPrompt = [
        prompt,
        template.style,
        gameStyle,
        colorPalette ? `color palette: ${colorPalette}` : '',
        'high quality, game ready asset',
        assetType === 'sprite' ? 'transparent background preferred' : ''
      ].filter(Boolean).join(', ');

      // ── Canva Text to Image API ──
      const canvaRes = await fetch(`${CANVA_API_BASE}/ai/image/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${canvaPublicKey}:${canvaKid}`)}`
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          style: gameStyle === 'pixel art' ? 'PIXEL_ART' : 'DIGITAL_ART',
          width: finalWidth,
          height: finalHeight,
          quality: 'standard'
        })
      });

      // Handle response — Canva mungkin return job ID dulu (async)
      if (canvaRes.ok) {
        const canvaData = await canvaRes.json();
        return new Response(JSON.stringify({
          success: true,
          jobId: canvaData.job?.id || null,
          imageUrl: canvaData.image?.url || canvaData.url || null,
          status: canvaData.status || 'completed',
          prompt: enhancedPrompt,
          assetType,
          dimensions: { width: finalWidth, height: finalHeight },
          timestamp: new Date().toISOString()
        }), { status: 200, headers: cors });
      }

      // Fallback: Canva API mungkin butuh auth yang berbeda
      // Return mock response untuk development
      const errText = await canvaRes.text();
      console.error('Canva API error:', errText);

      // Development mode: return placeholder
      return new Response(JSON.stringify({
        success: false,
        error: `Canva API: ${canvaRes.status}`,
        detail: errText,
        // Placeholder untuk UI preview
        placeholder: {
          prompt: enhancedPrompt,
          assetType,
          dimensions: { width: finalWidth, height: finalHeight },
          previewUrl: `https://placehold.co/${finalWidth}x${finalHeight}/1a2535/00d4ff?text=${encodeURIComponent(assetType.toUpperCase())}`
        }
      }), { status: 200, headers: cors });
    }

    // ════════════════════════════════
    // STATUS — Cek status job Canva (async generation)
    // ════════════════════════════════
    if (req.method === 'GET' && action === 'status') {
      const jobId = url.searchParams.get('jobId');
      if (!jobId) return new Response(JSON.stringify({ error: 'jobId diperlukan' }), { status: 400, headers: cors });

      const statusRes = await fetch(`${CANVA_API_BASE}/ai/image/generate/${jobId}`, {
        headers: {
          'Authorization': `Basic ${btoa(`${canvaPublicKey}:${canvaKid}`)}`
        }
      });

      if (!statusRes.ok) {
        return new Response(JSON.stringify({ error: 'Job tidak ditemukan' }), { status: 404, headers: cors });
      }

      const statusData = await statusRes.json();
      return new Response(JSON.stringify({
        jobId,
        status: statusData.status,
        imageUrl: statusData.image?.url || null,
        progress: statusData.progress || null
      }), { status: 200, headers: cors });
    }

    // ════════════════════════════════
    // TEMPLATES — Daftar template yang tersedia
    // ════════════════════════════════
    if (req.method === 'GET' && action === 'templates') {
      return new Response(JSON.stringify({
        templates: Object.entries(ASSET_TEMPLATES).map(([key, val]) => ({
          id: key,
          name: key.charAt(0).toUpperCase() + key.slice(1),
          ...val
        })),
        gameStyles: [
          'pixel art',
          'cartoon',
          'realistic',
          'low poly',
          'hand drawn',
          'isometric',
          'anime',
          'dark fantasy',
          'sci-fi',
          'retro'
        ]
      }), { status: 200, headers: cors });
    }

    return new Response(JSON.stringify({ error: 'Action tidak dikenal' }), { status: 400, headers: cors });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
