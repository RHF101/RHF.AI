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
      const seed = Math.floor(Math.random() * 999999);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    // --- JALUR CHAT (LLAMA-3 VIA ROUTER BARU) ---
    // URL Router terbaru tidak pakai '/hf-inference' di tengahnya
    const response = await fetch(
      "https://router.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct",
      {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({
          inputs: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\nKamu adalah RHF-AI Omni-Core v2. Kamu asisten teknik cerdas buatan Radit Tiya. Ahli coding dan modding. Jawab dengan sangat teliti.<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${pesan}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`,
          parameters: {
            max_new_tokens: 2048,
            temperature: 0.7,
            return_full_text: false
          }
        }),
      }
    );

    const data = await response.json();

    // Cek jika response sukses (biasanya array)
    if (Array.isArray(data) && data[0].generated_text) {
      return res.status(200).json({ type: "text", reply: data[0].generated_text.trim() });
    } 
    
    // Cek jika error loading (503)
    if (data.error) {
      return res.status(200).json({ type: "text", reply: `INFO: ${data.error}` });
    }

    return res.status(200).json({ type: "text", reply: "Router terhubung tapi data kosong. Coba lagi, Dit!" });

  } catch (err) {
    return res.status(200).json({ type: "text", reply: "SYSTEM CRASH: Masalah pada kodingan Fetch Router." });
  }
}
