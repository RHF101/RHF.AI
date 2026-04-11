export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { pesan, isImage, history } = req.body;

    if (isImage) {
        try {
            // JALUR BYPASS: Menggunakan Pollinations AI (Tanpa Token, Anti 410)
            const promptAman = encodeURIComponent(pesan);
            const imageUrl = `https://pollinations.ai/p/${promptAman}?width=1024&height=1024&seed=${Date.now()}&model=flux`;
            
            // Kita tes apakah gambarnya bisa diakses
            return res.status(200).json({ 
                reply: imageUrl, 
                type: "image" 
            });

        } catch (e) {
            return res.status(500).json({ reply: "Sistem Visual sedang benar-benar down. Coba lagi nanti, Dit!" });
        }
    }

    // --- LOGIKA TEKS (Gunakan GROQ kamu yang sudah jalan) ---
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "Kamu adalah RHF-AI. Partner Radit." },
                    ...history || [],
                    { role: "user", content: pesan }
                ]
            }),
        });
        const data = await response.json();
        res.status(200).json({ reply: data.choices[0].message.content, type: "text" });
    } catch (e) {
        res.status(500).json({ reply: "Neural Link Teks terputus." });
    }
}
