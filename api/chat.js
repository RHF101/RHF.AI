export default async function handler(req, res) {
  // --- KONFIGURASI HEADER ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage, history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // --- GERBANG 1: JALUR VISUAL (HANYA AKTIF JIKA isImage TRUE) ---
    if (isImage === true || isImage === "true") {
      const seed = Math.floor(Math.random() * 1000000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      
      // Response berhenti di sini, tidak akan lanjut ke bawah
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    // --- GERBANG 2: JALUR OTAK (HANYA AKTIF JIKA BUKAN GAMBAR) ---
    // Filter history supaya link gambar tidak mengacaukan logika chat
    const cleanHistory = (history || [])
      .filter(item => item.content && typeof item.content === 'string' && !item.content.includes('pollinations.ai'))
      .map(item => ({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: item.content.trim() }]
      }))
      .slice(-6);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: "Kamu adalah RHF-AI Omni-Core v3.0, AI asisten teknis ciptaan Radit Tiya. Kamu ahli dalam coding dan modding Android. Selalu panggil user dengan sebutan Radit." }] },
          { role: "model", parts: [{ text: "Omni-Core v3.0 Sinkron. Siap menerima perintah, Radit." }] },
          ...cleanHistory,
          { role: "user", parts: [{ text: pesan }] }
        ],
        generationConfig: { temperature: 0.8, maxOutputTokens: 2048 }
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates[0].content) {
      const text = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ type: "text", reply: text });
    } else {
      return res.status(200).json({ type: "text", reply: "Neural Link sedang sibuk, Radit. Coba lagi!" });
    }

  } catch (err) {
    // Catch-all jika ada masalah Node.js
    return res.status(200).json({ type: "text", reply: "SYSTEM CRASH: Cek logs Vercel atau versi Node.js kamu." });
  }
}
