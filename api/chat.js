export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage } = req.body;
    const token = process.env.HUGGINGFACE_TOKEN;

    // --- JALUR GAMBAR (FLUX) ---
    if (isImage === true || isImage === "true") {
      const urlImg = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&model=flux`;
      return res.status(200).json({ type: "image", reply: urlImg });
    }

    // --- JALUR CHAT (LLAMA 3 VIA ROUTER) ---
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
          parameters: { 
            max_new_tokens: 1000,
            return_full_text: false
          },
          options: { wait_for_model: true }
        }),
      }
    );

    // Ambil data dalam bentuk teks dulu untuk antisipasi error non-JSON
    const textData = await response.text();
    let data;
    
    try {
        data = JSON.parse(textData);
    } catch (e) {
        return res.status(200).json({ type: "text", reply: `ERROR SERVER: ${textData.substring(0, 100)}` });
    }

    if (data && Array.isArray(data) && data[0].generated_text) {
      return res.status(200).json({ type: "text", reply: data[0].generated_text.trim() });
    } else {
      const info = data.error || "Model sedang sinkronisasi.";
      return res.status(200).json({ type: "text", reply: `INFO: ${info}` });
    }

  } catch (err) {
    return res.status(200).json({ type: "text", reply: `TRANSMISI GAGAL: ${err.message}` });
  }
}
