export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
  
    try {
        const { pesan, isImage, history, fileContent, mode } = req.body;
        
        const geminiKey = process.env.GEMINI_API_KEY; 
        const groqKey = process.env.GROQ_API_KEY;
        const fbDbUrl = "https://rhf-confrims-default-rtdb.firebaseio.com/perintah_ai.json";

        if (!pesan && !fileContent) {
            return res.status(200).json({ type: "text", reply: "Status: Standby..." });
        }

        // --- FITUR GAMBAR ---
        if (isImage === true || isImage === "true") {
            const urlImg = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&model=flux`;
            return res.status(200).json({ type: "image", reply: urlImg });
        }

        // --- STEP 1: ORCHESTRATOR (Pendeteksi Niat) ---
        // Jika mode dikirim dari frontend 'RAKIT', kita paksa ke jalur rakit
        let intent = mode ? mode.toUpperCase() : "";

        if (!intent) {
            const checkRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: `Analisa pesan: "${pesan}". Jika minta bangun/rakit/pasang objek 3D balas "RAKIT". Jika minta koding balas "CODING". Selain itu "CHAT". Balas 1 kata.` }] }]
                })
            });
            const checkData = await checkRes.json();
            intent = checkData.candidates[0].content.parts[0].text.trim().toUpperCase();
        }

        // --- STEP 2: EKSEKUSI ---

        if (intent === "RAKIT") {
            // AI MENGHASILKAN INSTRUKSI UNTUK GODOT
            const buildRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: `Ubah instruksi ini jadi JSON murni untuk Godot: "${pesan}". Format: {"objek": "nama_file", "pos": {"x":0, "y":0, "z":0}}. Jangan beri teks lain.` }] }]
                })
            });
            const buildData = await buildRes.json();
            const rawJson = buildData.candidates[0].content.parts[0].text;
            
            // Kirim ke Firebase agar Godot bisa baca
            await fetch(fbDbUrl, {
                method: "PUT", // Pakai PUT supaya nindih perintah lama
                headers: { "Content-Type": "application/json" },
                body: rawJson
            });

            return res.status(200).json({ type: "rakit", reply: "Instruksi rakit sudah dikirim ke Firebase!", data: JSON.parse(rawJson) });

        } else if (intent === "CODING") {
            // JALUR GEMINI PRO (Dewa Koding)
            const responsePro = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: pesan }] }],
                    systemInstruction: { parts: [{ text: "Kamu adalah RHF-AI PRO CODER. Tulis kode utuh dan rapi." }] }
                })
            });
            const dataPro = await responsePro.json();
            return res.status(200).json({ type: "text", reply: dataPro.candidates[0].content.parts[0].text });

        } else {
            // JALUR CHAT (GROQ - Cepat & Asik)
            const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "system", content: "Kamu adalah RHF-AI." }, { role: "user", content: pesan }],
                    temperature: 0.8
                })
            });
            const dataGroq = await groqRes.json();
            return res.status(200).json({ type: "text", reply: dataGroq.choices[0].message.content });
        }

    } catch (err) {
        return res.status(200).json({ type: "text", reply: `[SISTEM ERROR]: ${err.message}` });
    }
              }
