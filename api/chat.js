export default async function handler(req, res) {
  // --- KONFIGURASI CORS ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    // Penambahan history dan fileContent pada body request
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

    // 3. JALUR CHAT (Optimalisasi Fitur Baru)
    let messages = [
      { 
        role: "system", 
        content: `Kamu adalah RHF-AI Omni-Core v2. 
        Identitas: Asisten cerdas, adaptif, dan hidup buatan Radit Tiya (System Architect).
        
        KEMAMPUAN KHUSUS:
        - Memory: Ingat konteks lama dan identitas user.
        - Advanced Coding: Ciptakan kode yang modular, rapi, berstruktur tinggi, dan efisien.
        - Debugging: Cek potensi error secara otomatis sebelum memberikan kode.
        - Reasoning: Pecahkan masalah langkah demi langkah (Multi-step thinking).
        - File Understanding: Analisa data dari file teks/kode yang dikirim user.
        
        ATURAN FORMAT OUTPUT:
        - Gunakan Markdown (Bold, Lists) dengan spasi antar bagian yang jelas.
        - WAJIB gunakan Code Blocks (\`\`\`) lengkap dengan nama bahasa pemrogramannya.
        - Struktur Jawaban: Analisa Masalah > Solusi/Kode > Penjelasan Fitur > Cara Implementasi.
        - Pastikan kode yang dihasilkan bersifat "Ready to Use" (Siap pakai).
        - Berikan jarak (spacing) yang cukup antar paragraf agar enak dibaca.`
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

    // Menggabungkan konteks File jika tersedia
    let finalPrompt = pesan;
    if (fileContent) {
      finalPrompt = `[DATA FILE ATTACHED]\n${fileContent}\n\n[USER REQUEST]\n${pesan}`;
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
        temperature: 0.6, // Suhu optimal untuk keseimbangan logika dan kreativitas
        max_tokens: 4096,
        top_p: 0.95
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
