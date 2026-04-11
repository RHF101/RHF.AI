export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // Pastikan request adalah POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Gunakan POST' });
  }

  const { pesan, isImage, history } = req.body;

  try {
    // --- JALUR 1: GENERATE GAMBAR (Tetap Pakai Yang Kamu Suka) ---
    if (isImage === true) {
      const seed = Math.floor(Math.random() * 1000000);
      // Tetap pakai Pollinations karena kamu suka hasilnya
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    // --- JALUR 2: OTAK CHAT (Ganti Model ke yang Lebih Cepat/Stabil) ---
    const API_KEY = process.env.GROQ_API_KEY;
    
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Kita ganti ke model yang lebih stabil 'versatile'
        messages: [
          { role: "system", content: "Kamu adalah RHF-AI. Jawab dengan singkat, padat, dan teknis." },
          ...(history || []),
          { role: "user", content: pesan }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (data.choices && data.choices[0]) {
      return res.status(200).json({ 
        type: "text", 
        reply: data.choices[0].message.content 
      });
    } else {
      // Jika Groq gagal, kita beri respon darurat agar web tidak "SYSTEM ERROR"
      return res.status(200).json({ 
        type: "text", 
        reply: "Maaf Dit, koneksi ke Groq lagi padat. Coba chat lagi sedetik lagi." 
      });
    }

  } catch (error) {
    // Jika semua gagal, kirim JSON yang valid, jangan lempar Error 500
    return res.status(200).json({ 
      type: "text", 
      reply: "Sistem sedang restart jalur neural. Coba kirim ulang pesannya." 
    });
  }
}
