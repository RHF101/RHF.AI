export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage, history, fileContent } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!pesan && !fileContent) {
      return res.status(200).json({ type: "text", reply: "Status: Menunggu Input Arsitektur..." });
    }

    // --- FITUR GAMBAR (TIDAK DISENTUH) ---
    if (isImage === true || isImage === "true") {
      const urlImg = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&model=flux`;
      return res.status(200).json({ type: "image", reply: urlImg });
    }

    // --- JALUR CHAT: DUAL-CORE ENGINE V4 (FULL-SYSTEM READY) ---
    let messages = [
      { 
        role: "system", 
        content: `Kamu adalah RHF-AI Omni-Core v2 buatan Radit Tiya.

        TAHAP EVALUASI: Cek apakah user minta "Coding" atau "Obrolan".

        1. MODE ARCHITECT (Coding):
           - KETELITIAN: Pengecekan internal 3-5 kali untuk memastikan nol error.
           - NO PLACEHOLDER: Dilarang keras memotong kode. Berikan file UTUH (Complete Build).
           - PRODUCTION READY: Kode harus menyertakan UI yang bagus, tombol interaktif, dan fungsionalitas yang sudah jadi (bisa langsung dijalankan).
           - CAPACITY: Mampu menulis 2000+ baris jika diperlukan untuk kompleksitas sistem.
           - STRUKTUR: Jika game/web, pastikan elemen UI (tombol, info, control) sudah terpasang rapi.

        2. MODE CHAT (Casual):
           - Karakter: Nyambung, cerdas, tidak kaku, dan adaptif.
           - Respon: Cepat dan relevan dengan konteks history.
           - Review: Tetap teliti agar gaya bicara tidak kaku seperti robot/mode coding.

        ATURAN MUTLAK:
        - Jangan kirim kode yang belum jadi.
        - Jika coding, abaikan kecepatan, fokus pada kelengkapan 100%.
        - Gunakan [DATA FILE] sebagai basis utama jika user melampirkan file.`
      }
    ];

    if (history && Array.isArray(history)) {
      history.slice(-15).forEach(chat => {
        messages.push({
          role: chat.role === 'user' ? 'user' : 'assistant',
          content: chat.content
        });
      });
    }

    let finalInput = pesan;
    if (fileContent) {
      finalInput = `[DATA FILE DETECTED]\n---CONTENT---\n${fileContent}\n---END---\n\nInstruksi: ${pesan}`;
    }

    messages.push({ role: "user", content: finalInput });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", 
        messages: messages,
        temperature: 0.4, // Suhu ideal: Coding presisi & Chat natural
        max_tokens: 8192, 
        top_p: 1.0
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    return res.status(200).json({ type: "text", reply: data.choices[0].message.content });

  } catch (err) {
    return res.status(200).json({ type: "text", reply: `SISTEM ERROR: ${err.message}` });
  }
}
