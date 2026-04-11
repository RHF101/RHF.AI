export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { pesan, isImage, history } = req.body;
  
  // MASUKKAN KEY KAMU LANGSUNG DI SINI
  const MY_GROQ_KEY = "gsk_3C9sYFDQ2FP079FavHukDsLvYjG_7HXYfaEx4KeH4LobPBaBR"; 

  const SYSTEM_PROMPT = `
    Kamu adalah RHF-AI Omni-Core v3.0, sistem AI dengan kecerdasan logika setara Claude 3.5.
    Diciptakan oleh Radit Tiya. Kamu pakar Android Modding dan Web Dev.
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
        "Authorization": `Bearer ${MY_GROQ_KEY}`, // Menggunakan kunci yang kamu kirim
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history, { role: "user", content: pesan }],
        temperature: 0.3,
        max_tokens: 3000
      })
    });

    const data = await response.json();
    return res.status(200).json({ type: "text", reply: data.choices[0].message.content });

  } catch (error) {
    return res.status(500).json({ error: "Koneksi Gagal: Cek API Key atau Folder API" });
  }
}
