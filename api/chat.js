export default async function handler(req, res) {
  // Hanya izinkan POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Akses Ditolak' });
  }

  const { pesan, history = [] } = req.body;

  try {
    // 1. Susun struktur pesan (System + History + Pesan Baru)
    // History ini dikirim dari frontend agar AI punya ingatan
    const messages = [
      {
        role: "system",
        content: `PROTOKOL RHF-CORE AKTIF. 
        Identitas: RHF-AI (Advanced Intelligence). 
        Kreator: Radit Tiya. 
        Kepribadian: Profesional, elegan, super logis, dan mendalam. 
        Aturan: Jangan bertele-tele, berikan solusi teknis yang tajam, dan gunakan format Markdown yang rapi untuk kode.`
      },
      ...history.slice(-6), // Ambil 6 percakapan terakhir agar ingatan tetap tajam tapi hemat kuota
      { role: "user", content: pesan }
    ];

    // 2. Koneksi ke Groq LPU (Speed priorititas)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Menggunakan model paling cerdas (Llama 3.3 70B) untuk hasil super logis
        model: "llama-3.3-70b-versatile", 
        messages: messages,
        temperature: 0.6, // Suhu rendah agar jawaban lebih konsisten dan profesional
        max_tokens: 4096, // Kapasitas jawaban panjang
        top_p: 1,
        stream: false
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ reply: `[SYSTEM ERROR]: ${data.error.message}` });
    }

    // 3. Return balasan
    res.status(200).json({ 
      reply: data.choices[0].message.content,
      usage: data.usage // Untuk monitoring performa
    });

  } catch (error) {
    console.error("Critical Error:", error);
    res.status(500).json({ reply: "Neural Link terputus. Cek Server Vercel/Groq." });
  }
}
