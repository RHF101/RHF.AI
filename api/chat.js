export default async function handler(req, res) {
  // --- KONTROL AKSES (CORS) ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage, history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // --- JALUR 1: VISUAL (POLLINATIONS FLUX) ---
    // Hanya aktif jika tombol Magic Sparkles ditekan (isImage === true)
    if (isImage === true || isImage === "true") {
      const seed = Math.floor(Math.random() * 1000000000);
      // Menggunakan model Flux yang paling tajam
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      
      return res.status(200).json({ 
        type: "image", 
        reply: imageUrl 
      });
    }

  }
}
    // --- JALUR OTAK (FORCE TO GEMINI-PRO) ---
    const cleanHistory = (history || [])
      .filter(item => item.content && typeof item.content === 'string' && !item.content.includes('pollinations.ai'))
      .map(item => ({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: item.content.trim() }]
      }))
      .slice(-6);

    // KUNCI PERBAIKAN: Kita ganti ke model 'gemini-1.5-pro' atau 'gemini-pro'
    // Dan pastikan menggunakan v1beta kembali karena di iad1 v1 sering rewel
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: "Kamu adalah RHF-AI Omni-Core v3.0, asisten teknis ciptaan Radit Tiya. Jawab dengan sangat cerdas." }] },
          { role: "model", parts: [{ text: "Siap Radit, Omni-Core tersinkronisasi." }] },
          ...cleanHistory,
          { role: "user", parts: [{ text: pesan }] }
        ],
        generationConfig: { 
          temperature: 0.8, 
          maxOutputTokens: 2048 
        }
      })
    });
