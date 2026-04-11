export default async function handler(req, res) {
    // Header wajib agar data bisa lewat antar server
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { pesan, isImage } = req.body;

        if (isImage) {
            // Gunakan Seed Random agar gambar selalu baru dan tidak kena cache (error 410)
            const seed = Math.floor(Math.random() * 1000000);
            const promptAman = encodeURIComponent(pesan);
            
            // Link Langsung ke Engine Flux via Pollinations
            const imageUrl = `https://pollinations.ai/p/${promptAman}?width=1024&height=1024&seed=${seed}&model=flux`;
            
            // Kita kirimkan URL gambarnya
            return res.status(200).json({ 
                reply: imageUrl, 
                type: "image" 
            });
        }

        // LOGIKA TEKS (GROQ)
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
        const groqData = await groqResponse.json();
        return res.status(200).json({ reply: groqData.choices[0].message.content, type: "text" });

    } catch (error) {
        return res.status(500).json({ reply: "Jalur Neural Terputus. Cek Koneksi Vercel!" });
    }
}
