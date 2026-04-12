export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (isImage === true || isImage === "true") {
      const urlImg = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&model=flux`;
      return res.status(200).json({ type: "image", reply: urlImg });
    }

    // Pakai model Llama-3.3-70b (Versi terbaru & paling stabil di Groq)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-specdec", 
        messages: [
          { role: "system", content: "Kamu adalah RHF-AI Omni-Core v2. Kamu adalah asisten teknis cerdas buatan Radit Tiya, seorang System Architect berbakat berumur 13 tahun." },
          { role: "user", content: pesan }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(200).json({ type: "text", reply: `Pesan Groq: ${data.error.message}` });
    }

    const reply = data.choices[0].message.content;
    return res.status(200).json({ type: "text", reply: reply });

  } catch (err) {
    return res.status(200).json({ type: "text", reply: `Kabel Putus: ${err.message}` });
  }
}
