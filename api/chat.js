export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
  
    try {
        const { pesan, mode } = req.body;
        const geminiKey = process.env.GEMINI_API_KEY; 
        const groqKey = process.env.GROQ_API_KEY;
        const tavilyKey = process.env.TAVILY_API_KEY;
        
        // Endpoint Firebase
        const fbPerintahUrl = "https://rhf-confrims-default-rtdb.firebaseio.com/perintah_ai.json";
        const fbLogUrl = "https://rhf-confrims-default-rtdb.firebaseio.com/logs_perubahan.json";

        if (!pesan) return res.status(200).json({ reply: "Status: Standby..." });

        // --- STEP 1: ORCHESTRATOR ---
        const brainRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: `Analisa: "${pesan}". Balas 1 kata: SEARCH, RAKIT, HISTORY, atau CHAT.` }] }]
            })
        });
        const brainData = await brainRes.json();
        let intent = mode ? mode.toUpperCase() : (brainData.candidates?.[0].content.parts[0].text.trim().toUpperCase() || "CHAT");

        // --- STEP 2: LOGIKA EKSEKUSI ---

        // A. JALUR HISTORY (MELIHAT CATATAN PERUBAHAN)
        if (intent === "HISTORY") {
            const logRes = await fetch(fbLogUrl);
            const logs = await logRes.json();
            const logString = JSON.stringify(logs);
            
            const historyRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: `Ini adalah data log perubahan map: ${logString}. Rangkum perubahan apa saja yang terjadi beberapa jam terakhir untuk menjawab: ${pesan}` }] }]
                })
            });
            const historyData = await historyRes.json();
            return res.status(200).json({ type: "text", reply: historyData.candidates[0].content.parts[0].text });
        }

        // B. JALUR RAKIT & CATAT (MASTER CONTROLLER)
        if (intent === "RAKIT") {
            const builderRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: pesan }] }],
                    systemInstruction: { parts: [{ text: `Kamu MASTER CONTROLLER. Balas HANYA JSON: {"nodes": [{"name": "obj", "file": "nama_file", "pos": [0,0,0], "rot": [0,0,0], "scale": [1,1,1], "script": ""}]}` }] }
                })
            });
            const builderData = await builderRes.json();
            let rawJson = builderData.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
            
            // 1. Kirim Perintah ke Godot
            await fetch(fbPerintahUrl, { method: "PUT", body: rawJson });

            // 2. CATAT PERUBAHAN KE LOG (DENGAN WAKTU)
            const logData = {
                waktu: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
                deskripsi: pesan,
                detail: JSON.parse(rawJson)
            };
            await fetch(fbLogUrl, { 
                method: "POST", // POST akan menambah list baru, bukan menindih
                body: JSON.stringify(logData) 
            });

            return res.status(200).json({ type: "rakit", reply: "Perubahan telah diterapkan dan dicatat dalam memori.", data: JSON.parse(rawJson) });
        }

        // C. JALUR SEARCH (INTERNET)
        if (intent === "SEARCH") {
            const searchRes = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: tavilyKey, query: pesan })
            });
            const searchData = await searchRes.json();
            const finalRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: `Info: ${JSON.stringify(searchData.results)}. Jawab: ${pesan}` }] }]
                })
            });
            const finalData = await finalRes.json();
            return res.status(200).json({ type: "text", reply: finalData.candidates[0].content.parts[0].text });
        }

        // D. JALUR CHAT BIASA (GROQ)
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "system", content: "Kamu RHF-AI." }, { role: "user", content: pesan }]
            })
        });
        const dataGroq = await groqRes.json();
        return res.status(200).json({ type: "text", reply: dataGroq.choices[0].message.content });

    } catch (err) {
        return res.status(200).json({ reply: `[SISTEM ERROR]: ${err.message}` });
    }
}
