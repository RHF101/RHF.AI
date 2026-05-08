export default async function handler(req, res) {
    const {
        GEMINI_API_KEY: geminiKey,
        GROQ_API_KEY: groqKey,
        TAVILY_API_KEY: tavilyKey
    } = process.env;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    async function fetchWithTimeout(url, options = {}, timeout = 8500) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(id);
            return response;
        } catch (e) {
            clearTimeout(id);
            throw e;
        }
    }

    try {
        const { pesan, mode } = req.body;
        if (!pesan) return res.status(200).json({ reply: "Core RHF-AI: Standby." });
        if (!geminiKey || !groqKey) throw new Error("API_KEY_MISSING");

        const fbUrl = "https://rhf-confrims-default-rtdb.firebaseio.com/perintah_ai.json";
        const logUrl = "https://rhf-confrims-default-rtdb.firebaseio.com/logs_perubahan.json";

        // --- STAGE 1: SECURE ORCHESTRATOR ---
        let intent = mode?.toUpperCase() || "CHAT";

        if (!mode) {
            const orchRes = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: `Analisa: "${pesan}". Pilih: RAKIT, SEARCH, atau CHAT. Balas 1 kata.` }] }]
                })
            });
            const orchData = await orchRes.json();
            const rawText = orchData.candidates?.[0]?.content?.parts?.[0]?.text?.toUpperCase() || "";
            intent = rawText.includes("RAKIT") ? "RAKIT" : rawText.includes("SEARCH") ? "SEARCH" : "CHAT";
        }

        // --- STAGE 2: ROBUST EXECUTION ---

        if (intent === "RAKIT") {
            const memoryRes = await fetchWithTimeout(`${logUrl}?orderBy="$key"&limitToLast=10`).catch(() => null);
            const memory = memoryRes?.ok ? await memoryRes.json() : {};

            const builderRes = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: pesan }] }],
                    systemInstruction: { 
                        parts: [{ text: `MASTER GODOT. Konteks: ${JSON.stringify(memory)}. Balas HANYA JSON: {"thought": "...", "nodes": [...]}.` }] 
                    }
                })
            });
            const bData = await builderRes.json();
            const content = bData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!content) throw new Error("AI_NO_RESPONSE");

            let parsed;
            try {
                const cleanJson = content.replace(/```json|```/g, "").trim();
                parsed = JSON.parse(cleanJson);
            } catch (pErr) {
                throw new Error("JSON_PARSE_FAILED: AI memberikan format ilegal.");
            }

            const thought = parsed.thought || "Mengeksekusi perintah arsitektur.";
            
            // Parallel Writes with individual error handling
            await Promise.all([
                fetch(fbUrl, { method: "PUT", body: JSON.stringify({ nodes: parsed.nodes || [] }) }).catch(e => console.error("FB_ERR:", e)),
                fetch(logUrl, { 
                    method: "POST", 
                    body: JSON.stringify({ ts: Date.now(), action: pesan, logic: thought }) 
                }).catch(e => console.error("LOG_ERR:", e))
            ]);

            return res.status(200).json({ type: "rakit", reply: `🛠️ **Action:** ${thought}`, data: parsed.nodes });
        }

        if (intent === "SEARCH") {
            if (!tavilyKey) throw new Error("TAVILY_KEY_MISSING");
            
            const sRes = await fetchWithTimeout('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: tavilyKey, query: pesan })
            });
            const sData = await sRes.json();
            const results = sData.results?.map(r => r.content).join("\n") || "Info tidak ditemukan.";
            
            const sumRes = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: `Data: ${results}\n\nJawab: ${pesan}` }] }]
                })
            });
            const sumData = await sumRes.json();
            return res.status(200).json({ reply: sumData.candidates?.[0]?.content?.parts?.[0]?.text || "Gagal merangkum data." });
        }

        // DEFAULT: GROQ
        const gRes = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: pesan }],
                temperature: 0.6
            })
        });
        const gData = await gRes.json();
        return res.status(200).json({ reply: gData.choices?.[0]?.message?.content || "Otak cadangan tidak merespon." });

    } catch (err) {
        console.error("Master Error:", err);
        return res.status(200).json({ reply: `⚠️ **System Error:** ${err.message}` });
    }
                                            }
