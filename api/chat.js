export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage, history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // --- JALUR VISUAL (POLLINATIONS FLUX) ---
    if (isImage === true || isImage === "true") {
      const seed = Math.floor(Math.random() * 1000000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    // --- JALUR OTAK (GEMINI 1.5 FLASH) ---
    // Pastikan history dibersihkan agar tidak ada karakter aneh
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
          { role: "user", parts: [{ text: "Kamu adalah RHF-AI Omni-Core v3.0, AI asisten teknis ciptaan Radit Tiya. Kamu sangat teliti dalam coding, modding, dan engineering. Selalu panggil user dengan sebutan Radit." }] },
          { role: "model", parts: [{ text: "Sistem Aktif. Menunggu perintah dari Radit Tiya." }] },
          ...cleanHistory,
          { role: "user", parts: [{ text: pesan }] }
        ],
        generationConfig: { 
          temperature: 0.8, 
          maxOutputTokens: 2048,
          topP: 0.95
        }
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates[0].content) {
      const text = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ type: "text", reply: text });
    } else {
      // Menangkap error spesifik dari Google
      const msg = data.error ? data.error.message : "Neural Link Busy";
      return res.status(200).json({ type: "text", reply: `Sistem Error: ${msg}` });
    }

  } catch (err) {
    return res.status(200).json({ type: "text", reply: "Backend Offline. Cek API Key di Vercel!" });
  }
}
