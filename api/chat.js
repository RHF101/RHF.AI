export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage } = req.body;
    const token = process.env.HUGGINGFACE_TOKEN;

    // --- JALUR GAMBAR (FLUX - CEPAT & MANTAP) ---
    if (isImage === true || isImage === "true") {
      const seed = Math.floor(Math.random() * 999999);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    // --- JALUR CHAT & CODING (LLAMA-3 SUPER TELITI) ---
    const response = await fetch(
      "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct",
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({
          inputs: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\nKamu adalah RHF-AI Omni-Core v2, asisten teknik super cerdas ciptaan Radit Tiya. Kamu sangat ahli dalam Coding, Android Modding, dan System Architect. Jawablah setiap pertanyaan Radit dengan sangat teliti, berikan kode yang bersih, dan gunakan bahasa Indonesia yang santai tapi profesional.<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${pesan}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`,
          parameters: {
            max_new_tokens: 2048,
            temperature: 0.7,
            top_p: 0.9,
            return_full_text: false
          }
        }),
      }
    );

    const data = await response.json();
    
    if (data && data[0] && data[0].generated_text) {
      // Membersihkan teks jika ada sisa-sisa prompt yang ikut terbawa
      let reply = data[0].generated_text.trim();
      return res.status(200).json({ type: "text", reply: reply });
    } else {
      // Jika model sedang sibuk/loading
      const errorDetail = data.error ? data.error : "Model sedang loading di server Hugging Face.";
      return res.status(200).json({ type: "text", reply: `Llama Core sedang kalibrasi: ${errorDetail}. Tunggu 10 detik dan coba lagi, Radit.` });
    }

  } catch (err) {
    return res.status(200).json({ type: "text", reply: "SYSTEM ERROR: Jalur komunikasi Hugging Face terputus." });
  }
}
