export default async function handler(req, res) {
  // --- SETTING HEADER (Wajib ada biar gak diblokir browser) ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage, history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // --- JALUR 1: VISUAL (PRIORITAS UTAMA) ---
    // Kita taruh paling atas supaya kalau Gemini error, gambar tetep jalan!
    if (isImage === true || isImage === "true") {
      const seed = Math.floor(Math.random() * 999999);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      
      return res.status(200).json({ 
        type: "image", 
        reply: imageUrl 
      });
    }

    // --- JALUR 2: OTAK (FIXED GEMINI LOGIC) ---
    // Kita buat filter history yang sangat simpel supaya gak bikin crash
    let contents = [
      { role: "user", parts: [{ text: "Kamu adalah RHF-AI Omni-Core v3.0, asisten teknis cerdas ciptaan Radit Tiya. Jawablah dengan cerdas dan teknis." }] },
      { role: "model", parts: [{ text: "Siap Radit, Omni-Core aktif." }] }
    ];

    // Tambahkan history jika ada dan valid
    if (Array.isArray(history)) {
      history.slice(-4).forEach(item => {
        if (item.content && typeof item.content === 'string' && !item.content.includes('http')) {
          contents.push({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: item.content }]
          });
        }
      });
    }

    // Tambahkan pesan terbaru
    contents.push({ role: "user", parts: [{ text: pesan }] });

    // Gunakan model Flash (v1beta adalah yang paling update untuk model ini)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates[0].content) {
      const text = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ type: "text", reply: text });
    } else {
      // Jika model flash tidak ditemukan, kita kasih pesan error yang jelas
      const errorMsg = data.error ? data.error.message : "Neural Link Busy";
      return res.status(200).json({ type: "text", reply: `Sistem Error: ${errorMsg}` });
    }

  } catch (err) {
    // Ini yang bikin pesan "Hubungan Terputus" muncul di web kamu
    console.error(err);
    return res.status(500).json({ type: "text", reply: "Backend Crash. Cek Logs Vercel!" });
  }
}
