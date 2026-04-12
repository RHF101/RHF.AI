export default async function handler(req, res) {
  // --- Header Keamanan ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage } = req.body;
    const token = process.env.HUGGINGFACE_TOKEN;

    if (!token) {
        return res.status(200).json({ type: "text", reply: "ERROR: HUGGINGFACE_TOKEN belum disetting di Vercel!" });
    }

    // --- JALUR GAMBAR ---
    if (isImage === true || isImage === "true") {
      const seed = Math.floor(Math.random() * 999999);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    // --- JALUR CHAT (STABLE ROUTER) ---
    const response = await fetch(
      "https://router.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct",
      {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({
          inputs: pesan, // Kirim pesan langsung (format paling stabil untuk router)
          parameters: {
            max_new_tokens: 1000,
            temperature: 0.7,
            wait_for_model: true // Meminta server menunggu jika model sedang loading
          }
        }),
      }
    );

    const data = await response.json();

    // Pastikan data ada dan tidak kosong
    if (data && Array.isArray(data) && data[0].generated_text) {
      return res.status(200).json({ type: "text", reply: data[0].generated_text.trim() });
    } else if (data.error) {
      return res.status(200).json({ type: "text", reply: `INFO SERVER: ${data.error}` });
    } else {
      return res.status(200).json({ type: "text", reply: "Sistem menerima data kosong. Coba kirim ulang, Radit." });
    }

  } catch (err) {
    console.error("Fetch Error:", err);
    return res.status(200).json({ type: "text", reply: "Koneksi ke Router Gagal. Cek internet server atau Token HF kamu!" });
  }
}
