export default async function handler(req, res) {
    // Header agar bisa diakses dari frontend mana saja (CORS)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { pesan, isImage, history } = req.body;

    // AMBIL TOKEN DARI VERCEL SETTINGS
    const GROQ_KEY = process.env.GROQ_API_KEY;
    const HF_TOKEN = "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";

    // --- LOGIKA JIKA USER MINTA GAMBAR ---
    if (isImage) {
        try {
            const response = await fetch(
                "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
                {
                    headers: { 
                        "Authorization": `Bearer ${HF_TOKEN}`,
                        "Content-Type": "application/json"
                    },
                    method: "POST",
                    body: JSON.stringify({ inputs: pesan }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            const blob = await response.blob();
            const buffer = Buffer.from(await blob.arrayBuffer());
            const base64Image = buffer.toString('base64');
            
            return res.status(200).json({ 
                reply: `data:image/png;base64,${base64Image}`, 
                type: "image" 
            });
        } catch (e) {
            console.error("HF Error:", e);
            return res.status(500).json({ reply: "Sistem Visual sedang sibuk, Dit. Coba sebentar lagi!" });
        }
    }

    // --- LOGIKA JIKA CHAT BIASA (TEKS) ---
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { 
                        role: "system", 
                        content: "Kamu adalah RHF-AI Omni-Core, asisten cerdas buatan Radit Tiya. Kamu sangat ahli dalam pengembangan sistem, desain luxury, dan logika tingkat tinggi. Berikan jawaban yang padat, taktis, dan gunakan sedikit gaya bahasa hacker yang keren." 
                    },
                    ...history || [],
                    { role: "user", content: pesan }
                ],
                temperature: 0.7,
                max_tokens: 2048
            }),
        });

        const data = await response.json();
        
        if (data.choices && data.choices[0]) {
            res.status(200).json({ 
                reply: data.choices[0].message.content, 
                type: "text" 
            });
        } else {
            throw new Error("Invalid response from Groq");
        }
    } catch (error) {
        console.error("Groq Error:", error);
        res.status(500).json({ reply: "Sistem Teks sedang offline. Cek API Key di Vercel!" });
    }
}
