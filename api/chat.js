export default async function handler(req, res) {
  // --- KONFIGURASI CORS (Biar bisa diakses dari domain manapun) ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    // 1. VALIDASI INPUT
    if (!pesan) {
      return res.status(200).json({ type: "text", reply: "Kirim pesan dulu, Bos." });
    }

    // 2. FITUR GENERATE GAMBAR (Jalur Pollinations)
    if (isImage === true || isImage === "true") {
      const urlImg = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&model=flux`;
      return res.status(200).json({ type: "image", reply: urlImg });
    }

    // 3. JALUR CHAT (Groq Llama 3.3-70B Versatile)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", 
        messages: [
          { 
            role: "system", 
            content: `Kamu adalah RHF-AI Omni-Core v2. 
            Identitas: Asisten cerdas buatan Radit Tiya (System Architect muda).
            
            ATURAN FORMAT OUTPUT:
            - Gunakan Markdown (Bold, Lists) agar rapi.
            - WAJIB gunakan Code Blocks ( \`\`\` ) untuk semua kode.
            - Pisahkan antara Penjelasan, Kode, dan Cara Pakai.
            - Gunakan bahasa yang teknis tapi mudah dimengerti.
            - Jangan berikan jawaban yang menumpuk/tanpa spasi.`
          },
          { role: "user", content: pesan }
        ],
        temperature: 0.7, // Biar jawaban lebih kreatif tapi tetap terkontrol
        max_tokens: 4096  // Kapasitas jawaban panjang
      })
    });

    const data = await response.json();

    // 4. HANDLING ERROR DARI SERVER GROQ
    if (data.error) {
      console.error("Groq Error:", data.error);
      return res.status(200).json({ 
        type: "text", 
        reply: `⚠️ INFO GROQ: ${data.error.message}` 
      });
    }

    // 5. KIRIM BALASAN SUKSES
    const reply = data.choices[0].message.content;
    return res.status(200).json({ type: "text", reply: reply });

  } catch (err) {
    // 6. HANDLING ERROR SISTEM (KABEL PUTUS)
    console.error("System Crash:", err);
    return res.status(200).json({ 
      type: "text", 
      reply: `🚀 CRASH: Terjadi masalah pada transmisi data. Error: ${err.message}` 
    });
  }
}
