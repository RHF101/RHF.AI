export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage, history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // --- JALUR GAMBAR (TETAP SEPERTI SEMULA - CEPAT & BAGUS) ---
    if (isImage === true || isImage === "true") {
      const seed = Math.floor(Math.random() * 999999);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    // --- JALUR CHAT & CODING (OTAK BARU) ---
    // Pakai endpoint 'gemini-1.5-flash-latest' dengan v1beta yang paling luas aksesnya
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: "Kamu adalah RHF-AI Omni-Core v3.0, asisten teknis ciptaan Radit Tiya. Kamu sangat ahli dalam coding, modding Android, dan system architect. Selalu panggil user dengan sebutan Radit." }] },
          { role: "model", parts: [{ text: "Sistem Aktif. Menunggu perintah teknis dari Radit." }] },
          { role: "user", parts: [{ text: pesan }] }
        ],
        generationConfig: { 
          temperature: 0.9, // Biar lebih kreatif dalam coding
          maxOutputTokens: 4096 // Token lebih besar biar codingan gak kepotong
        }
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates[0].content) {
      const text = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ type: "text", reply: text });
    } else {
      // Jika masih error, kita paksa keluarin pesan aslinya buat diagnosa
      const msg = data.error ? data.error.message : "Neural Link Busy";
      return res.status(200).json({ type: "text", reply: `Akses Ditolak Google: ${msg}. Dit, pastikan API Key sudah benar di Vercel!` });
    }

  } catch (err) {
    return res.status(200).json({ type: "text", reply: "Backend Crash. Cek logs Vercel!" });
  }
}
