export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage, history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (isImage === true || isImage === "true") {
      const seed = Math.floor(Math.random() * 1000000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    const cleanHistory = (history || [])
      .filter(item => item.content && item.content.trim() !== "")
      .map(item => ({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: item.content }]
      }))
      .slice(-10);

    // KUNCI PERBAIKAN: Gunakan v1beta dan tambahkan -latest pada model
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: "Kamu adalah RHF-AI Omni-Core v3.0, asisten cerdas ciptaan Radit Tiya. Kamu ahli dalam coding, engineering, dan modding. Jawablah dengan sangat teliti, rapi, dan teknis." }] },
          { role: "model", parts: [{ text: "Siap, Radit Tiya. Sistem Omni-Core v3.0 Aktif." }] },
          ...cleanHistory,
          { role: "user", parts: [{ text: pesan }] }
        ],
        generationConfig: { 
          temperature: 0.7, 
          topP: 0.95,
          maxOutputTokens: 4096 
        }
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates[0].content) {
      const text = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ type: "text", reply: text });
    } else if (data.error) {
      return res.status(200).json({ 
        type: "text", 
        reply: `SYSTEM ERROR [${data.error.status}]: ${data.error.message}` 
      });
    } else {
      return res.status(200).json({ type: "text", reply: "Neural Link Limit tercapai. Coba lagi, Dit!" });
    }

  } catch (err) {
    return res.status(200).json({ type: "text", reply: "Sistem Offline. Cek koneksi atau Key kamu." });
  }
}
