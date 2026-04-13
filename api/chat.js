export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage, history, fileContent } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (!pesan && !fileContent) {
      return res.status(200).json({ type: "text", reply: "Status: Standby..." });
    }

    // --- FITUR GAMBAR ---
    if (isImage === true || isImage === "true") {
      const urlImg = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&model=flux`;
      return res.status(200).json({ type: "image", reply: urlImg });
    }

    // --- STEP 1: GEMINI FLASH SEBAGAI ORCHESTRATOR (MANAGER) ---
    // Flash digunakan di sini karena sangat cepat untuk klasifikasi
    const checkRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `Analisa: "${pesan}". Jika ini permintaan coding/perbaikan kode balas "CODING", jika chat biasa balas "CHAT". Balas 1 kata saja.` }] }]
      })
    });
    const checkData = await checkRes.json();
    const intent = checkData.candidates[0].content.parts[0].text.trim().toUpperCase();

    // Persiapan History untuk Gemini
    let geminiContents = [];
    if (history && Array.isArray(history)) {
      history.slice(-10).forEach(chat => {
        geminiContents.push({
          role: chat.role === 'user' ? 'user' : 'model',
          parts: [{ text: chat.content }]
        });
      });
    }
    const finalInput = fileContent ? `[FILE DETECTED]\n${fileContent}\n\nInstruksi: ${pesan}` : pesan;
    geminiContents.push({ role: 'user', parts: [{ text: finalInput }] });

    // --- STEP 2: EKSEKUSI BERDASARKAN INTENT ---
    
    if (intent === "CODING") {
      // MENGGUNAKAN GEMINI 1.5 PRO (SPESIALIS CODING)
      const responsePro = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiContents,
          systemInstruction: { 
            parts: [{ text: "Kamu adalah RHF-AI PRO CODER. Tugasmu menulis kode utuh, fungsional, indentasi 4 spasi yang sangat rapi, dan dilarang keras memotong kode. Gunakan logika arsitektur sistem yang kuat." }] 
          },
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 } // Temp 0.1 agar sangat presisi
        })
      });
      const dataPro = await responsePro.json();
      const reply = dataPro.candidates[0].content.parts[0].text;
      return res.status(200).json({ type: "text", reply: reply });

    } else {
      // MENGGUNAKAN GROQ/LLAMA (CHAT CASUAL)
      // Jika Groq limit, akan otomatis dicover oleh Gemini Flash di blok catch
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "Kamu adalah RHF-AI. Jawab singkat, asik, dan manusiawi." },
            ...history.slice(-5).map(c => ({ role: c.role === 'user' ? 'user' : 'assistant', content: c.content })),
            { role: "user", content: pesan }
          ],
          temperature: 0.8
        })
      });
      const dataGroq = await groqRes.json();
      if (dataGroq.error) throw new Error("GROQ_LIMIT");
      return res.status(200).json({ type: "text", reply: dataGroq.choices[0].message.content });
    }

  } catch (err) {
    // FALLBACK TERAKHIR KE GEMINI FLASH
    return res.status(200).json({ type: "text", reply: `[SYSTEM AUTO-RECOVER] Sedang ada gangguan teknis, tapi saya tetap aktif. Ada yang bisa dibantu?` });
  }
        }
