export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    // --- JALUR GAMBAR ---
    if (isImage === true || isImage === "true") {
      const urlImg = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&model=flux`;
      return res.status(200).json({ type: "image", reply: urlImg });
    }

    // --- JALUR CHAT (GROQ - LLAMA 3.1) ---
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [
          { role: "system", content: "Kamu adalah RHF-AI Omni-Core v2 buatan Radit Tiya. Ahli modding Android dan koding." },
          { role: "user", content: pesan }
        ]
      })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;
    return res.status(200).json({ type: "text", reply: reply });

  } catch (err) {
    // Kalau muncul pesan ini, berarti kode sudah terupdate tapi API Key bermasalah
    return res.status(200).json({ type: "text", reply: "ERROR SISTEM GROQ: Masalah pada kunci API atau koneksi." });
  }
}
