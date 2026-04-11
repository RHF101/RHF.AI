export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage, history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // --- JALUR VISUAL (SUPER CEPAT) ---
    if (isImage === true || isImage === "true") {
      const seed = Math.floor(Math.random() * 1000000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    // --- JALUR OTAK (BIAR NYAMBUNG & TELITI) ---
    // Kita susun history agar Gemini ingat instruksi awal kamu
    const formattedHistory = (history || []).map(item => ({
      role: item.role === 'user' ? 'user' : 'model',
      parts: [{ text: item.content }]
    }));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: "Kamu adalah RHF-AI Omni-Core v3.0, ahli coding dan modding. Jawab dengan sangat teliti dan teknis." }] },
          { role: "model", parts: [{ text: "Siap, Radit. Sistem aktif. Apa tugas saya?" }] },
          ...formattedHistory,
          { role: "user", parts: [{ text: pesan }] }
        ],
        generationConfig: { temperature: 0.7, topP: 0.95 }
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates[0].content) {
      const text = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ type: "text", reply: text });
    } else {
      // Jika error dari Google, kita kasih info teknis biar tahu salahnya dimana
      return res.status(200).json({ type: "text", reply: "Neural Link Limit tercapai atau Key salah. Cek Vercel Logs, Dit!" });
    }

  } catch (err) {
    return res.status(200).json({ type: "text", reply: "Sistem Offline. Coba cek koneksi internet atau API Key kamu." });
  }
}
