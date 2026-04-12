export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage } = req.body;
    const token = process.env.HUGGINGFACE_TOKEN;

    // --- JALUR GAMBAR (STABIL) ---
    if (isImage === true || isImage === "true") {
      const seed = Math.floor(Math.random() * 999999);
      const urlImg = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      return res.status(200).json({ type: "image", reply: urlImg });
    }

    // --- JALUR CHAT (MISTRAL 7B - JALUR PALING STABIL) ---
    const response = await fetch(
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3",
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

    // Ambil teks asli dulu buat jaga-jaga kalau bukan JSON
    const rawData = await response.text();
    
    let data;
    try {
      data = JSON.parse(rawData);
    } catch (e) {
      return res.status(200).json({ type: "text", reply: `SERVER ERROR: HF ngirim teks mentah: ${rawData}` });
    }

    if (Array.isArray(data) && data[0].generated_text) {
      return res.status(200).json({ type: "text", reply: data[0].generated_text.trim() });
    } else {
      const msg = data.error || "Model sedang sibuk, coba lagi nanti.";
      return res.status(200).json({ type: "text", reply: `INFO: ${msg}` });
    }

  } catch (err) {
    return res.status(200).json({ type: "text", reply: `SYSTEM CRASH: ${err.message}` });
  }
}
