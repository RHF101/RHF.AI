export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage } = req.body;
    const token = process.env.HUGGINGFACE_TOKEN;

    // --- JALUR GAMBAR ---
    if (isImage === true || isImage === "true") {
      const seed = Math.floor(Math.random() * 999999);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    // --- JALUR CHAT (STABLE ROUTE) ---
    // Menggunakan model Mistral-7B-v0.3 sebagai alternatif yang lebih stabil di Router baru
    const response = await fetch(
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3",
      {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({
          inputs: `<s>[INST] Kamu adalah RHF-AI Omni-Core v2 buatan Radit Tiya. Kamu ahli coding. Jawab pertanyaan ini dengan teliti dalam Bahasa Indonesia: ${pesan} [/INST]`,
          parameters: {
            max_new_tokens: 1500,
            temperature: 0.7
          }
        }),
      }
    );

    const data = await response.json();

    // Jika berhasil dapat teks
    if (Array.isArray(data) && data[0].generated_text) {
      let reply = data[0].generated_text.split('[/INST]').pop().trim();
      return res.status(200).json({ type: "text", reply: reply });
    } 
    
    // Jika model sedang loading
    if (data.error && data.error.includes("loading")) {
      return res.status(200).json({ type: "text", reply: "Sistem sedang booting... Tunggu 20 detik dan kirim lagi ya, Dit." });
    }

    return res.status(200).json({ type: "text", reply: `Info Server: ${JSON.stringify(data)}` });

  } catch (err) {
    console.error(err);
    return res.status(200).json({ type: "text", reply: "Neural Link putus total. Cek apakah Token HF di Vercel sudah benar, Dit!" });
  }
}
