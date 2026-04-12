export default async function handler(req, res) {
  // Biar browser nggak blokir
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    // --- JALUR GAMBAR (FLUX) ---
    if (isImage === true || isImage === "true") {
      const urlImg = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&model=flux`;
      return res.status(200).json({ type: "image", reply: urlImg });
    }

    // --- JALUR CHAT (GROQ + LLAMA 3.1 70B) ---
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [
          { 
            role: "system", 
            content: "Kamu adalah RHF-AI Omni-Core v2. Kamu asisten teknik cerdas buatan Radit Tiya. Kamu sangat ahli dalam koding, modding Android, dan system architecture. Berikan jawaban yang sangat teliti, detail, dan profesional dalam bahasa Indonesia." 
          },
          { role: "user", content: pesan }
        ],
        temperature: 0.6,
        max_tokens: 4096
      })
    });

    const data = await response.json();

    // Validasi data dari Groq
    if (data.choices && data.choices[0].message) {
      const reply = data.choices[0].message.content;
      return res.status(200).json({ type: "text", reply: reply });
    } else {
      return res.status(200).json({ type: "text", reply: "INFO: Groq sedang penuh atau API Key salah." });
    }

  } catch (err) {
    return res.status(200).json({ type: "text", reply: `ERROR SISTEM: ${err.message}` });
  }
}
