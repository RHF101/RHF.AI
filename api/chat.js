export default async function handler(req, res) {
  // 1. Setup Header Keamanan & Akses (CORS) - AGAR WEB TIDAK BLOKIR KITA
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // 2. Wajib POST, kalau tidak, tolak
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sistem Error: Permintaan harus POST.' });
  }

  try {
    const { pesan, isImage, history } = req.body;
    
    // --- MODE JENERET GAMBAR (TETAP KEREN & PAKE FLUX) ---
    if (isImage === true || isImage === "true") {
      const seed = Math.floor(Math.random() * 1000000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    // --- MODE CHAT & CODING (OTAK GEMINI SUPER CERDAS) ---
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) {
      return res.status(200).json({ type: "text", reply: "ERROR TEKNIS: API Key Gemini belum dipasang di Vercel Settings." });
    }

    // Bangun instruksi sistem agar Gemini jadi sangat teliti
    const systemInstruction = `Kamu adalah RHF-AI Omni-Core v3.0, AI Super Genius ciptaan Radit Tiya. Kamu ahli dalam Smali, Web Engineering (HTML/CSS/JS), Android Modding, dan Fintech. Jawab permintaan user dengan bahasa teknis, teliti, rapi, dan solutif. Jika ada coding, tulis dalam format Markdown yang benar. Bersikaplah sopan namun tegas, layaknya asisten pribadi seorang senior engineer.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemInstruction} \n\n User: ${pesan}` }]
        }],
        generationConfig: {
            temperature: 0.6, // Biar jawabannya kreatif tapi tetap akurat
            maxOutputTokens: 8192 // Pastikan jawabannya tidak terpotong
        }
      })
    });

    const data = await response.json();

    // Verifikasi data yang kembali dari Gemini
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const replyText = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ type: "text", reply: replyText });
    } else {
      throw new Error("Respon AI kosong atau tidak valid");
    }

  } catch (error) {
    // 3. PENYELAMATAN ERROR FATAL - Kirim teks agar web tidak memunculkan kotak merah
    console.error("CRITICAL ERROR: ", error);
    return res.status(200).json({ 
      type: "text", 
      reply: "Sistem sedang kalibrasi ulang jalur neural. Coba kirim ulang pesan kamu, Dit." 
    });
  }
}
