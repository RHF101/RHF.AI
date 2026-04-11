export default async function handler(req, res) {
  // Setup Header agar tidak kena blokir (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan metode POST' });

  const { pesan, isImage } = req.body;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  try {
    // --- MODE GENERATE GAMBAR (Tetap Kualitas Tinggi) ---
    if (isImage) {
      const seed = Math.floor(Math.random() * 999999);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    // --- MODE CHAT & CODING (Otak Gemini Baru) ---
    if (!GEMINI_KEY) {
      return res.status(200).json({ type: "text", reply: "Sistem Error: API Key Gemini belum terpasang di Vercel Settings." });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Kamu adalah RHF-AI Omni-Core v3.0, AI cerdas ciptaan Radit Tiya. Kamu ahli dalam coding, web engineer, dan android modding. Jawab dengan gaya keren dan teknis: ${pesan}` }]
        }]
      })
    });

    const data = await response.json();
    
    // Ambil teks hasil jawaban Gemini
    if (data.candidates && data.candidates[0].content.parts[0].text) {
      const replyText = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ type: "text", reply: replyText });
    } else {
      throw new Error("Respon kosong");
    }

  } catch (error) {
    // Jika ada error, kirim balasan teks (supaya web tidak memunculkan kotak merah)
    return res.status(200).json({ 
      type: "text", 
      reply: "Neural Link sedang sinkronisasi ulang. Coba kirim pesan lagi, Dit." 
    });
  }
}
