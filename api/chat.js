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

    // --- JALUR 2: OTAK (GEMINI 1.5 FLASH) ---
    // Membersihkan history agar tidak mengirim link gambar ke Gemini (biar gak error)
    const cleanHistory = (history || [])
      .filter(item => item.content && typeof item.content === 'string' && !item.content.includes('pollinations.ai'))
      .map(item => ({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: item.content.trim() }]
      }))
      .slice(-6); // Mengambil 6 pesan terakhir agar memori tetap kuat

    // Menggunakan endpoint v1 (Paling stabil untuk region Washington iad1)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { 
            role: "user", 
            parts: [{ text: "Kamu adalah RHF-AI Omni-Core v3.0, asisten teknis ciptaan Radit Tiya. Kamu ahli dalam coding dan modding. Selalu panggil user dengan sebutan Radit." }] 
          },
          { 
            role: "model", 
            parts: [{ text: "Siap Radit, Omni-Core v3.0 aktif dan tersinkronisasi." }] 
          },
          ...cleanHistory,
          { role: "user", parts: [{ text: pesan }] }
        ],
        generationConfig: { 
          temperature: 0.7, 
          maxOutputTokens: 2048 
        }
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates[0].content) {
      const text = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ 
        type: "text", 
        reply: text 
      });
    } else if (data.error) {
      // Menangkap pesan error spesifik jika ada masalah API
      return res.status(200).json({ 
        type: "text", 
        reply: `SYSTEM ERROR: ${data.error.message}` 
      });
    } else {
      return res.status(200).json({ 
        type: "text", 
        reply: "Neural Link sedang kalibrasi, Radit. Coba kirim ulang." 
      });
    }

  } catch (err) {
    // Jika backend crash total
    return res.status(200).json({ 
      type: "text", 
      reply: "SYSTEM OFFLINE: Terjadi gangguan pada serverless function." 
    });
  }
}
