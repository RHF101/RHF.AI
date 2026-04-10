export default async function handler(req, res) {
  // 1. Keamanan: Hanya izinkan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Protokol Ditolak. Gunakan metode POST.' });
  }

  const { pesan } = req.body;

  // 2. Validasi Input
  if (!pesan) {
    return res.status(400).json({ reply: "Input kosong. RHF-CORE memerlukan data untuk diproses." });
  }

  try {
    // 3. Koneksi ke Neural Engine (Groq Cloud)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Menggunakan model terbaru sesuai rekomendasi Groq 2026
        model: "llama-3.1-8b-instant", 
        messages: [
          {
            role: "system",
            content: `PROTOKOL RHF-CORE AKTIF. 
            Identitas: RHF-AI. 
            Kreator: Radit Tiya. 
            Karakter: Super logis, teknis, cerdas, dan dingin namun setia. 
            Tugas: Berikan penjelasan mendalam dan solusi akurat. 
            Gaya Bahasa: Gunakan istilah IT/Hacker jika relevan, minimalis, dan elegan.`
          },
          { role: "user", content: pesan }
        ],
        temperature: 0.65, // Keseimbangan antara kreativitas dan logika
        max_tokens: 2048,  // Penjelasan bisa lebih panjang dan detail
        top_p: 0.9,
      }),
    });

    const data = await response.json();

    // 4. Penanganan Error dari Provider
    if (data.error) {
      console.error("Groq API Error:", data.error);
      return res.status(500).json({ 
        reply: `[SYSTEM ERROR]: ${data.error.message}. Pastikan GROQ_API_KEY sudah benar di Vercel.` 
      });
    }

    // 5. Kirim Balasan ke Frontend
    res.status(200).json({ reply: data.choices[0].message.content });

  } catch (error) {
    // 6. Penanganan Error Jaringan
    console.error("Server Error:", error);
    res.status(500).json({ 
      reply: "Koneksi RHF-CORE terputus. Gagal menghubungi Neural Engine." 
    });
  }
}
