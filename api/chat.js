export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { pesan, isImage, history } = req.body;
  
  // Mengambil kunci secara aman dari settingan Vercel
  const API_KEY = process.env.GROQ_API_KEY; 

  const SYSTEM_PROMPT = `
    Kamu adalah RHF-AI Omni-Core v3.0. Kecerdasan setara Claude 3.5 Sonnet.
    Diciptakan oleh Radit Tiya (System Architect).
    Keahlian: Android Modding (Smali/Root) & Web Development.
    Gaya bicara: Profesional, teknis, dan sangat teliti.
  `;

  try {
    if (isImage) {
      const seed = Math.floor(Math.random() * 999999);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history,
          { role: "user", content: pesan }
        ],
        temperature: 0.3,
        max_tokens: 3000
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
        return res.status(response.status).json({ error: "API Error", details: data });
    }

    return res.status(200).json({ type: "text", reply: data.choices[0].message.content });

  } catch (error) {
    return res.status(500).json({ error: "SYSTEM ERROR: Neural Link Offline." });
  }
}
