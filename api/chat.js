export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage, history, fileContent } = req.body;
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!pesan && !fileContent) {
      return res.status(200).json({ type: "text", reply: "Status: Standby..." });
    }

    // --- FITUR IMAGE GENERATOR (POLLINATIONS) ---
    if (isImage === true || isImage === "true") {
      const urlImg = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&model=flux`;
      return res.status(200).json({ type: "image", reply: urlImg });
    }

    // --- KONSTRUKSI PESAN ---
    const systemPrompt = `Kamu adalah RHF-AI Omni-Core v2 buatan Radit Tiya.
    PROTOKOL: 
    1. Chat ringan = Singkat & asik.
    2. Coding = Teliti, utuh, rapi (Markdown).
    3. Jika user komplain = Mode Deep-Architect aktif.`;

    let finalInput = fileContent ? `[FILE CONTENT]\n${fileContent}\n\nInstruksi: ${pesan}` : pesan;

    // --- FUNGSI UTAMA: MENCOBA GROQ DULU ---
    try {
      let groqMessages = [{ role: "system", content: systemPrompt }];
      if (history) {
        history.slice(-5).forEach(chat => { // Dipangkas ke -5 biar gak gampang limit TPM
          groqMessages.push({ role: chat.role === 'user' ? 'user' : 'assistant', content: chat.content });
        });
      }
      groqMessages.push({ role: "user", content: finalInput });

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: groqMessages,
          temperature: 0.6,
          max_tokens: 4096 // Dikecilkan biar gak kena limit TPM
        })
      });

      const groqData = await groqRes.json();
      
      // Jika Groq Error atau Limit, lempar ke catch untuk pindah ke Gemini
      if (groqData.error) throw new Error("GROQ_LIMIT");

      return res.status(200).json({ type: "text", reply: groqData.choices[0].message.content });

    } catch (error) {
      console.log("Groq Limit/Error, Switching to Gemini...");

      // --- BACKUP: GOOGLE GEMINI ENGINE ---
      let geminiContents = [];
      if (history) {
        history.slice(-10).forEach(chat => { // Gemini limitnya gede, bisa nampung history lebih banyak
          geminiContents.push({
            role: chat.role === 'user' ? 'user' : 'model',
            parts: [{ text: chat.content }]
          });
        });
      }
      geminiContents.push({ role: 'user', parts: [{ text: finalInput }] });

      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiContents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
        })
      });

      const geminiData = await geminiRes.json();
      if (geminiData.error) throw new Error(geminiData.error.message);

      const reply = geminiData.candidates[0].content.parts[0].text;
      return res.status(200).json({ type: "text", reply: `[AUTO-SWITCH] ${reply}` });
    }

  } catch (err) {
    return res.status(200).json({ type: "text", reply: `SISTEM CRITICAL ERROR: ${err.message}` });
  }
}
