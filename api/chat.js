export default async function handler(req, res) {
    // Header wajib agar data bisa lewat
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { pesan, isImage } = req.body;

        // JIKA USER MINTA GAMBAR
        if (isImage === true) {
            const promptAman = encodeURIComponent(pesan);
            const seed = Math.floor(Math.random() * 1000000);
            
            // Menggunakan endpoint "image.pollinations.ai" yang paling stabil
            const imageUrl = `https://image.pollinations.ai/prompt/${promptAman}?width=1024&height=1024&seed=${seed}&nologo=true`;
            
            return res.status(200).json({ 
                reply: imageUrl, 
                type: "image" 
            });
        }

        // JIKA USER MINTA TEKS (GROQ)
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: pesan }]
            }),
        });

        const data = await response.json();
        
        if (data.choices && data.choices[0]) {
            return res.status(200).json({ 
                reply: data.choices[0].message.content, 
                type: "text" 
            });
        } else {
            throw new Error("Respon API Kosong");
        }

    } catch (error) {
        console.error("Error Detail:", error.message);
        // Pesan error yang lebih spesifik biar kita tahu apa yang rusak
        return res.status(500).json({ 
            reply: `Internal Core Error: ${error.message}. Coba refresh, Dit!`, 
            type: "text" 
        });
    }
}
