export default async function handler(req, res) {
  // Header wajib agar tidak diblokir browser
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

    // --- JALUR CHAT (MISTRAL VIA ROUTER) ---
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
          parameters: { max_new_tokens: 1000 },
          options: { wait_for_model: true }
        }),
      }
    );

    const data = await response.json();

    if (Array.isArray(data) && data[0].generated_text) {
      return res.status(200).json({ type: "text", reply: data[0].generated_text.trim() });
    } else {
      // Jika server HF memberikan pesan error tertentu
      const errorMsg = data.error || "Gagal sinkronisasi otak AI.";
      return res.status(200).json({ type: "text", reply: `INFO: ${errorMsg}` });
    }

  } catch (err) {
    // Memberikan pesan error yang sangat detail agar kita tahu rusaknya di mana
    return res.status(200).json({ type: "text", reply: `LOG ERROR: ${err.message}` });
  }
}
