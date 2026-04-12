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
      const urlImg = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      return res.status(200).json({ type: "image", reply: urlImg });
    }

    // --- JALUR CHAT (VIA ROUTER BARU) ---
    const response = await fetch(
      "https://router.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3",
      {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({ 
          inputs: pesan,
          parameters: { 
            wait_for_model: true,
            max_new_tokens: 1000 
          } 
        }),
      }
    );

    const data = await response.json();

    // Validasi hasil dari router
    if (Array.isArray(data) && data[0].generated_text) {
      let reply = data[0].generated_text.trim();
      return res.status(200).json({ type: "text", reply: reply });
    } else {
      // Menangkap pesan error dari router (misal: model loading)
      const errorMsg = data.error || "Router terhubung, tapi AI sedang kalibrasi.";
      return res.status(200).json({ type: "text", reply: `INFO ROUTER: ${errorMsg}` });
    }

  } catch (err) {
    return res.status(200).json({ type: "text", reply: `SYSTEM CRASH: Masalah pada transmisi Router.` });
  }
}
