export default async function handler(req, res) {
  // 1. Tambahkan Header Keamanan agar Frontend bisa akses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request (khusus browser)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Gunakan metode POST' });
  }

  const { pesan, isImage, history } = req.body;
  const API_KEY = process.env.GROQ_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: "API KEY tidak terdeteksi di Vercel Settings!" });
  }

  try {
    if (isImage) {
      const seed = Math.floor(Math.random() * 999999);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    // Gunakan native fetch (Node 24 sudah mendukung ini)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          { role: "system", content: "Kamu adalah RHF-AI Omni-Core v3.0 by Radit Tiya." },
          ...history,
          { role: "user", content: pesan }
        ]
      })
    });

    const data = await response.json();
    return res.status(200).json({ type: "text", reply: data.choices[0].message.content });

  } catch (error) {
    return res.status(500).json({ error: "Koneksi Groq Gagal" });
  }
}
