export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { pesan, isImage, history } = req.body;
  
  // TOKEN GROQ ASLI (SUDAH AKTIF)
  const MY_GROQ_KEY = "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"; 

  const SYSTEM_PROMPT = `
    Kamu adalah RHF-AI Omni-Core v3.0. Kecerdasan: Setara Claude 3.5 Sonnet.
    Diciptakan oleh Radit Tiya (System Architect).
    
    Keahlian Khusus: 
    - Expert Android Modding (Smali, Magisk, Shell).
    - Senior Web Developer (Firebase, Tailwind).
    
    Tugas: Berikan jawaban yang sangat teliti, logis, dan teknis. 
    Jika ada kode, pastikan bersih dan siap pakai.
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
        "Authorization": `Bearer ${MY_GROQ_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-70b-8192", // Menggunakan model 70B yang paling jenius
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history,
          { role: "user", content: pesan }
        ],
        temperature: 0.3, // Sangat teliti
        max_tokens: 3000
      })
    });

    if (!response.ok) throw new Error("API Error");

    const data = await response.json();
    return res.status(200).json({ type: "text", reply: data.choices[0].message.content });

  } catch (error) {
    return res.status(500).json({ error: "SYSTEM ERROR: Jalur Neural Terputus." });
  }
}
