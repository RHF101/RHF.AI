export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { pesan, isImage, history } = req.body;
  
  // Mengambil API Key dari Dashboard Vercel (Environment Variables)
  const API_KEY = process.env.GROQ_API_KEY; 

  // Prompt Sistem untuk identitas Omni-Core
  const SYSTEM_PROMPT = `
    Kamu adalah RHF-AI Omni-Core v3.0.
    Diciptakan oleh Radit Tiya (System Architect & Web Engineer).
    Keahlian: Android Modding, Smali, Web Automation, dan Fintech Systems.
    Gaya bicara: Profesional, teknis, dan sangat jenius.
  `;

  try {
    // FITUR GENERASI GAMBAR (Jika isImage true)
    if (isImage) {
      const seed = Math.floor(Math.random() * 999999);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    // FITUR CHAT (Menggunakan Llama 3 di Groq)
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

    // Jika API Groq menolak (Key salah/expired)
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: "Neural Link Rejected", 
        details: data 
      });
    }

    // Kirim balasan teks ke Frontend
    return res.status(200).json({ 
      type: "text", 
      reply: data.choices[0].message.content 
    });

  } catch (error) {
    // Jika terjadi crash pada server
    console.error("Server Error:", error);
    return res.status(500).json({ error: "SYSTEM ERROR: Neural Link Offline." });
  }
}
