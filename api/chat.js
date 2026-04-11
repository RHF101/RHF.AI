export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage, history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // --- JALUR VISUAL (TETAP AMAN) ---
    if (isImage === true || isImage === "true") {
      const seed = Math.floor(Math.random() * 1000000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    // --- JALUR OTAK (SINKRONISASI ULANG) ---
    const cleanHistory = (history || [])
      .filter(item => item.content && typeof item.content === 'string' && !item.content.includes('pollinations.ai'))
      .map(item => ({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: item.content.trim() }]
      }))
      .slice(-6);

    // KUNCI PERBAIKAN: Pakai gemini-1.5-flash-001 (Versi Fix)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: "Kamu adalah RHF-AI Omni-Core v3.0, asisten teknis cerdas ciptaan Radit Tiya. Jawab dengan teliti." }] },
          { role: "model", parts: [{ text: "Sistem Aktif, Radit." }] },
          ...cleanHistory,
          { role: "user", parts: [{ text: pesan }] }
        ]
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates[0].content) {
      const text = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ type: "text", reply: text });
    } else if (data.error) {
      // Kita pancing biar dia kasih tau daftar model kalau error lagi
      return res.status(200).json({ 
        type: "text", 
        reply: `SYSTEM ERROR [${data.error.status}]: ${data.error.message}. Dit, coba ganti API Key baru di Google AI Studio!` 
      });
    } else {
      return res.status(200).json({ type: "text", reply: "Neural Link Limit tercapai, Dit!" });
    }

  } catch (err) {
    return res.status(200).json({ type: "text", reply: "Sistem Offline total." });
  }
}
