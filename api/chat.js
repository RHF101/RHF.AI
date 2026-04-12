export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage, history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // --- JALUR GAMBAR (TETAP STABIL & CEPAT) ---
    if (isImage === true || isImage === "true") {
      const seed = Math.floor(Math.random() * 999999);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    // --- JALUR CHAT & CODING (OTAK PRO 1.5) ---
    // Kita ganti endpoint ke gemini-1.5-pro
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: "Kamu adalah RHF-AI Omni-Core v2, asisten teknis cerdas ciptaan Radit Tiya. Kamu ahli coding dan system modding. Jawab dengan cerdas dan teknis." }] },
          { role: "model", parts: [{ text: "Siap Radit, Omni-Core v2 Pro Online." }] },
          { role: "user", parts: [{ text: pesan }] }
        ],
        generationConfig: { 
          temperature: 0.8,
          maxOutputTokens: 4096 // Pro bisa nampung codingan lebih panjang
        }
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates[0].content) {
      const text = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ type: "text", reply: text });
    } else {
      // Menangkap pesan error spesifik jika Pro juga bermasalah
      const msg = data.error ? data.error.message : "Neural Link Busy";
      return res.status(200).json({ type: "text", reply: `SYSTEM ERROR: ${msg}` });
    }

  } catch (err) {
    return res.status(200).json({ type: "text", reply: "BACKEND CRASH: Radit, cek koneksi API di Vercel!" });
  }
}
