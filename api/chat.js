export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
  
    try {
        const { pesan, mode, history } = req.body;
        const geminiKey = process.env.GEMINI_API_KEY; 
        const groqKey = process.env.GROQ_API_KEY;
        const tavilyKey = process.env.TAVILY_API_KEY; // UNTUK SEARCH INTERNET
        const fbDbUrl = "https://rhf-confrims-default-rtdb.firebaseio.com/perintah_ai.json";

        if (!pesan) return res.status(200).json({ reply: "Status: Standby..." });

        // --- STEP 1: BRAIN ANALYSIS (DETERMINE ACTION) ---
        const brainRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: `Analisa: "${pesan}". 
                Balas 1 kata saja: 
                - "SEARCH" jika butuh info terbaru/internet.
                - "RAKIT" jika minta bangun/ubah map Godot.
                - "CODING" jika minta script.
                - "CHAT" jika hanya ngobrol.` }] }]
            })
        });
        const brainData = await brainRes.json();
        let intent = mode ? mode.toUpperCase() : brainData.candidates[0].content.parts[0].text.trim().toUpperCase();

        // --- STEP 2: EXECUTION LOGIC ---

        // A. JALUR SEARCH (INTERNET)
        if (intent === "SEARCH") {
            const searchRes = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: tavilyKey, query: pesan, search_depth: "smart" })
            });
            const searchData = await searchRes.json();
            const context = JSON.stringify(searchData.results);
            
            // Jawab pakai context dari internet
            const finalRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: `Gunakan info ini: ${context}. Untuk menjawab: ${pesan}` }] }]
                })
            });
            const finalData = await finalRes.json();
            return res.status(200).json({ type: "search", reply: finalData.candidates[0].content.parts[0].text });
        }

        // B. JALUR RAKIT (MASTER CONTROLLER GODOT)
        if (intent === "RAKIT") {
            const builderRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: pesan }] }],
                    systemInstruction: { parts: [{ text: `Kamu MASTER CONTROLLER. Balas HANYA JSON. 
                    Format: {"nodes": [{"name": "obj", "file": "nama_file", "pos": [0,0,0], "rot": [0,0,0], "scale": [1,1,1], "script": "script_gd"}]}` }] }
                })
            });
            const builderData = await builderRes.json();
            const rawJson = builderData.candidates[0].content.parts[0].text.replace(/```json|```/g, "");
            
            await fetch(fbDbUrl, { method: "PUT", body: rawJson });
            return res.status(200).json({ type: "rakit", reply: "Map Berhasil Dimodifikasi!", data: JSON.parse(rawJson) });
        }

        // C. JALUR CODING (GEMINI PRO)
        if (intent === "CODING") {
            const codeRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: pesan }] }],
                    systemInstruction: { parts: [{ text: "Kamu adalah RHF-AI PRO CODER. Tulis kode utuh." }] }
                })
            });
            const codeData = await codeRes.json();
            return res.status(200).json({ type: "text", reply: codeData.candidates[0].content.parts[0].text });
        }

        // D. JALUR CHAT (GROQ - LLAMA 3)
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "system", content: "Kamu RHF-AI, asik dan pinter." }, { role: "user", content: pesan }]
            })
        });
        const dataGroq = await groqRes.json();
        return res.status(200).json({ type: "text", reply: dataGroq.choices[0].message.content });

    } catch (err) {
        return res.status(200).json({ reply: `[SISTEM ERROR]: ${err.message}` });
    }
                }
