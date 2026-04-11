export default async function handler(req, res) {
  // Header Keamanan & Akses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST' });

  const { pesan, isImage, history } = req.body;
  const API_KEY = process.env.GROQ_API_KEY;

  try {
    // 1. GENERATE GAMBAR (Kualitas Tinggi)
    if (isImage) {
      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    // 2. KECERDASAN NGOBROL & CODING (Llama 3 70B)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-70b-8192", // Model paling cerdas untuk coding
        messages: [
          { 
            role: "system", 
            content: "Kamu adalah RHF-AI Omni-Core v3.0, AI Super Genius ciptaan Radit Tiya. Kamu ahli dalam Smali, Web Engineering, Android Modding, dan Fintech. Berikan jawaban yang sangat teknis, detail, dan solutif." 
          },
          ...(history || []),
          { role: "user", content: pesan }
        ],
        temperature: 0.6, // Biar lebih kreatif tapi tetap akurat
        max_tokens: 4096
      })
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      return res.status(200).json({ 
        type: "text", 
        reply: data.choices[0].message.content 
      });
    } else {
      throw new Error("Gagal mengambil respon AI");
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Neural Link Overload" });
  }
}
