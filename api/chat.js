export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage } = req.body;
    const token = process.env.HUGGINGFACE_TOKEN;

    // --- JALUR GAMBAR (Flux Pollinations) ---
    if (isImage === true || isImage === "true") {
      const seed = Math.floor(Math.random() * 999999);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    // --- JALUR CHAT (Llama-3 Router) ---
    const response = await fetch(
      "https://router.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct",
      {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({ 
          inputs: pesan,
          parameters: { wait_for_model: true } 
        }),
      }
    );

    const data = await response.json();

    if (Array.isArray(data) && data[0].generated_text) {
      return res.status(200).json({ type: "text", reply: data[0].generated_text.trim() });
    } else {
      return res.status(200).json({ type: "text", reply: `INFO: ${data.error || "Model sedang booting, coba lagi."}` });
    }

  } catch (err) {
    return res.status(200).json({ type: "text", reply: "SYSTEM ERROR: Koneksi backend terputus." });
  }
}
