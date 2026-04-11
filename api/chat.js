export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { pesan, isImage, history } = req.body;

  // --- BRAIN CONFIGURATION (CLAUDE MINDSET) ---
  const SYSTEM_PROMPT = `
    Kamu adalah RHF-AI Omni-Core v3.0, sistem AI dengan kecerdasan logika setara Claude 3.5 Sonnet.
    Arsitek Pencipta: Radit Tiya.

    PROFIL TEKNIS:
    1. Pakar Android Engineering: Smali, Java, Shell Script, Rooting (Magisk/KSU), dan optimasi kernel.
    2. Senior Web Developer: HTML5, TailwindCSS, Firebase, JavaScript (Node.js).
    3. Analis Keamanan: Mampu melakukan audit kode dan menemukan bug dengan ketelitian 100%.

    GAYA KOMUNIKASI:
    - Profesional, dingin, efisien, dan sangat cerdas (Cyber-Noir).
    - Berikan solusi teknis yang langsung bisa dieksekusi.
    - Gunakan format Markdown untuk kode agar rapi.
    - Selalu lakukan self-correction sebelum memberikan output kode.

    KETELETIAN: Jika user meminta kode, pastikan tidak ada typo register atau syntax error.
  `;

  try {
    // 1. PENANGANAN GENERASI GAMBAR (POLLINATIONS)
    if (isImage) {
      const seed = Math.floor(Math.random() * 999999);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}`;
      
      return res.status(200).json({ 
        type: "image", 
        reply: imageUrl 
      });
    }

    // 2. PENANGANAN TEKS (GROQ LLAMA 3 70B)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-70b-8192", // Model 70B untuk logika tingkat tinggi
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history,
          { role: "user", content: pesan }
        ],
        temperature: 0.3, // Rendah agar sangat teliti dan tidak berhalusinasi
        max_tokens: 3000,
        top_p: 1,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Groq API Error:", errorData);
      throw new Error("Gagal terhubung ke Groq API");
    }

    const data = await response.json();
    const aiReply = data.choices[0].message.content;

    return res.status(200).json({ 
      type: "text", 
      reply: aiReply 
    });

  } catch (error) {
    console.error("Backend Error:", error);
    return res.status(500).json({ 
      error: "SYSTEM ERROR: Koneksi ke Omni-Core terputus.",
      details: error.message 
    });
  }
}
