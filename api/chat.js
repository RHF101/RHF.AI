export default async function handler(req, res) {
  // --- KONFIGURASI CORS ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage, history, fileContent } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!pesan && !fileContent) {
      return res.status(200).json({ type: "text", reply: "Kirim pesan atau lampirkan file, Bos." });
    }

    // 2. FITUR GENERATE GAMBAR (TETAP/TIDAK DISENTUH)
    if (isImage === true || isImage === "true") {
      const urlImg = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&model=flux`;
      return res.status(200).json({ type: "image", reply: urlImg });
    }

    // 3. JALUR CHAT (Optimalisasi Fitur Teks & Dokumen)
    let messages = [
      { 
        role: "system", 
        content: `Kamu adalah RHF-AI Omni-Core v2. 
        Identitas: Asisten cerdas dan hidup buatan Radit Tiya (System Architect).
        
        PROTOKOL ANALISA & CODING:
        - Jika ada [DATA FILE], baca dan pahami isinya secara mendalam sebagai referensi utama.
        - Bedakan teks obrolan dengan skrip. Gunakan teks biasa untuk bicara.
        - WAJIB gunakan Code Blocks (\`\`\`) untuk semua unit kode agar terpisah dari penjelasan.
        - Tambahkan baris baru (spacing) antar paragraf agar jawaban tidak menumpuk.
        - Pastikan kode modular, bersih, berstruktur tinggi, dan siap pakai.
        - Alur Jawaban: Analisa Masalah > Solusi/Kode > Penjelasan Teknis.`
      }
    ];

    // Mengintegrasikan Memori (History)
    if (history && Array.isArray(history)) {
      history.slice(-10).forEach(chat => {
        messages.push({
          role: chat.role === 'user' ? 'user' : 'assistant',
          content: chat.content
        });
      });
    }

    // Perbaikan Logika Pembacaan Dokumen (Diberi delimiter agar AI fokus)
    let finalPrompt = pesan;
    if (fileContent) {
      finalPrompt = `[DATA FILE ATTACHED]\n---ISI DOKUMEN---\n${fileContent}\n---AKHIR DOKUMEN---\n\n[USER REQUEST]\n${pesan}`;
    }

    messages.push({ role: "user", content: finalPrompt });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", 
        messages: messages,
        temperature: 0.4, // Diturunkan sedikit agar lebih teliti pada dokumen dan kode
        max_tokens: 4096,
        top_p: 0.9
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("Groq Error:", data.error);
      return res.status(200).json({ 
        type: "text", 
        reply: `⚠️ INFO GROQ: ${data.error.message}` 
      });
    }

    const reply = data.choices[0].message.content;
    return res.status(200).json({ type: "text", reply: reply });

  } catch (err) {
    console.error("System Crash:", err);
    return res.status(200).json({ 
      type: "text", 
      reply: `🚀 CRASH: Terjadi masalah pada transmisi data. Error: ${err.message}` 
    });
  }
}
