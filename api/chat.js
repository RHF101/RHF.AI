export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage } = req.body;
    const token = process.env.HUGGINGFACE_TOKEN;

    // Cek apakah token terbaca oleh Vercel
    if (!token) {
      return res.status(200).json({ type: "text", reply: "DEBUG: Token tidak terbaca! Pastikan sudah klik 'Add' dan 'Redeploy' di Vercel." });
    }

    // --- JALUR GAMBAR (Flux) ---
    if (isImage === true || isImage === "true") {
      const seed = Math.floor(Math.random() * 999999);
      const urlImg = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      return res.status(200).json({ type: "image", reply: urlImg });
    }

    // --- JALUR CHAT (Llama-3) ---
    const response = await fetch(
      "https://router.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct",
      {
        headers: { 
          "Authorization": `Bearer ${token.trim()}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({ inputs: pesan }),
      }
    );

    const data = await response.json();

    if (data && Array.isArray(data) && data[0].generated_text) {
      return res.status(200).json({ type: "text", reply: data[0].generated_text.trim() });
    } else {
      // Jika server HF kirim pesan error (seperti loading atau model not found)
      const detail = data.error || "Gagal mendapatkan teks dari AI.";
      return res.status(200).json({ type: "text", reply: `INFO SERVER: ${detail}` });
    }

  } catch (err) {
    // Memberikan info error asli ke chat agar kita bisa debug
    return res.status(200).json({ type: "text", reply: `SYSTEM CRASH: ${err.message}` });
  }
}
