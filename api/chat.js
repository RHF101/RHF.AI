export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage } = req.body;
    const token = process.env.HUGGINGFACE_TOKEN;

    // --- JALUR GAMBAR (STABIL & KENCANG) ---
    if (isImage === true || isImage === "true") {
      const seed = Math.floor(Math.random() * 999999);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    // --- JALUR CHAT (LLAMA-3 VIA STABLE ROUTER) ---
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/meta-llama/Meta-Llama-3-8B-Instruct",
      {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({
          inputs: pesan,
          parameters: {
            max_new_tokens: 1000,
            temperature: 0.7,
            wait_for_model: true 
          }
        }),
      }
    );

    // Jika server down atau token salah (Bukan 200 OK)
    if (!response.ok) {
        const errorData = await response.json();
        return res.status(200).json({ type: "text", reply: `INFO: ${errorData.error || 'Akses Ditolak HF'}` });
    }

    const data = await response.json();

    if (Array.isArray(data) && data[0].generated_text) {
      return res.status(200).json({ type: "text", reply: data[0].generated_text.trim() });
    } else {
      return res.status(200).json({ type: "text", reply: "Signal Lemah. Coba kirim ulang, Radit." });
    }

  } catch (err) {
    // Pesan ini hanya muncul jika fetch benar-benar tidak bisa jalan
    return res.status(200).json({ type: "text", reply: "SYSTEM: Jalur kabel backend bermasalah. Pastikan Token HF di Vercel sudah di-Add!" });
  }
}
