export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pesan } = req.body;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, // Pastikan ini ada di Vercel Env
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content: "PROTOKOL RHF-CORE AKTIF. Kamu adalah RHF-AI, asisten cerdas buatan Radit Tiya. Berikan penjelasan yang super logis, mendalam, dan teknis. Gunakan gaya bahasa mewah dan berwibawa."
          },
          { role: "user", content: pesan }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ reply: "Error dari Groq: " + data.error.message });
    }

    res.status(200).json({ reply: data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ reply: "Gagal menyambung ke server Groq. Cek koneksi API." });
  }
}
