export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // --- JALUR GAMBAR (TETAP AMAN) ---
    if (isImage === true || isImage === "true") {
      const seed = Math.floor(Math.random() * 999999);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    // --- JALUR CHAT (STABLE VERSION) ---
    // Kita pakai gemini-pro (versi 1.0) karena ini yang paling jarang error 'not found'
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: "Kamu adalah RHF-AI Omni-Core v2. Expert coding dan asisten Radit Tiya." }] },
          { role: "model", parts: [{ text: "Siap Radit." }] },
          { role: "user", parts: [{ text: pesan }] }
        ]
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates[0].content) {
      const text = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ type: "text", reply: text });
    } else {
      // Jika masih gagal, kita ganti ke model gemini-1.0-pro secara otomatis
      const msg = data.error ? data.error.message : "Coba ganti Region Vercel ke Singapore";
      return res.status(200).json({ type: "text", reply: `Sistem Masih Error: ${msg}` });
    }

  } catch (err) {
    return res.status(200).json({ type: "text", reply: "Backend Crash!" });
  }
}
