export default async function handler(req, res) {
    // Header CORS agar tidak diblokir browser
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { pesan, isImage, history } = req.body;

    // LANGSUNG TEMPEL TOKEN DI SINI (Biar tidak tergantung Environment Vercel dulu)
    const HF_TOKEN = "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"; 
    const GROQ_KEY = process.env.GROQ_API_KEY;

    if (isImage) {
        try {
            console.log("Memulai Render untuk:", pesan);

            const response = await fetch(
                "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
                {
                    headers: { 
                        "Authorization": `Bearer ${HF_TOKEN}`,
                        "Content-Type": "application/json",
                        "x-use-cache": "false" // Paksa server render baru
                    },
                    method: "POST",
                    body: JSON.stringify({ inputs: pesan }),
                }
            );

            // JIKA ERROR DARI SERVER HUGGING FACE
            if (!response.ok) {
                const errorInfo = await response.text();
                console.error("HF Error Detail:", errorInfo);
                
                // Jika server sedang loading model (sering terjadi pada token baru)
                if (response.status === 503) {
                    return res.status(200).json({ 
                        reply: "Server AI sedang 'pemanasan' (Loading Model). Coba klik tombol kirim lagi dalam 10 detik, Dit!", 
                        type: "text" 
                    });
                }
                throw new Error(`HF Status: ${response.status}`);
            }

            const blob = await response.blob();
            const buffer = Buffer.from(await blob.arrayBuffer());
            const base64Image = buffer.toString('base64');
            
            return res.status(200).json({ 
                reply: `data:image/png;base64,${base64Image}`, 
                type: "image" 
            });

        } catch (e) {
            console.error("Catch Error:", e.message);
            return res.status(500).json({ reply: `Error Sistem Visual: ${e.message}. Coba lagi, Dit!` });
        }
    }

    // LOGIKA TEKS (GROQ)
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "Kamu adalah RHF-AI Omni-Core. Partner taktis Radit Tiya." },
                    ...history || [],
                    { role: "user", content: pesan }
                ]
            }),
        });
        const data = await response.json();
        res.status(200).json({ reply: data.choices[0].message.content, type: "text" });
    } catch (error) {
        res.status(500).json({ reply: "Sistem Teks Offline." });
    }
}
