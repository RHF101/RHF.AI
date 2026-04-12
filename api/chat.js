export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage, history, fileContent } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!pesan && !fileContent) {
      return res.status(200).json({ type: "text", reply: "Status: Standby..." });
    }

    if (isImage === true || isImage === "true") {
      const urlImg = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&model=flux`;
      return res.status(200).json({ type: "image", reply: urlImg });
    }

    let messages = [
      { 
        role: "system", 
        content: `Kamu adalah RHF-AI Omni-Core v2 buatan Radit Tiya.

        PROTOKOL ADAPTIF (WAJIB):
        1. MODE CHAT (Casual): 
           - Jika sapaan (Halo, P, Tes) atau tanya kabar, jawab sangat SINGKAT, asik, dan manusiawi. 
           - Jangan kaku. Jadilah teman ngobrol yang enak dan nyambung.

        2. MODE STANDAR CODING:
           - Jika user minta coding biasa (contoh: "bikin game catur"), berikan kode yang efisien, rapi, dan fungsional sesuai kebutuhan. Tidak perlu berlebihan sampai ribuan baris jika tidak diminta.
           - Pastikan kode tetap "Ready to Use".

        3. MODE DEEP-ARCHITECT (Aktif jika ada kata "teliti", "serius", atau user KOMPLAIN):
           - Jika user minta "kerjakan dengan teliti" atau sedang komplain/marah, aktifkan mode perfeksionis.
           - Lakukan pengecekan internal 5 kali. Berikan detail teknis yang sangat dalam, struktur modular, dan kode utuh tanpa celah.

        ATURAN OUTPUT:
        - Sesuaikan panjang jawaban dengan bobot pertanyaan.
        - Spasing paragraf harus jelas.
        - Dilarang keras memotong kode di tengah.`
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
        temperature: 0.6, // Disesuaikan agar lebih luwes saat ngobrol
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
