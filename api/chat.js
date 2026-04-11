export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { pesan, isImage, history } = req.body;
    const HF_TOKEN = process.env.HF_TOKEN; 

    if (isImage) {
        // Daftar Model: Coba FLUX dulu, kalau 410/Error, coba Stable Diffusion
        const models = [
            "black-forest-labs/FLUX.1-schnell",
            "stabilityai/stable-diffusion-xl-base-1.0"
        ];

        for (const model of models) {
            try {
                const response = await fetch(
                    `https://api-inference.huggingface.co/models/${model}`,
                    {
                        headers: { 
                            "Authorization": `Bearer ${HF_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                        method: "POST",
                        body: JSON.stringify({ inputs: pesan }),
                    }
                );

                if (response.ok) {
                    const blob = await response.blob();
                    const buffer = Buffer.from(await blob.arrayBuffer());
                    return res.status(200).json({ 
                        reply: `data:image/png;base64,${buffer.toString('base64')}`, 
                        type: "image" 
                    });
                }
                
                console.log(`Model ${model} gagal, mencoba model berikutnya...`);
            } catch (err) {
                continue; // Lanjut ke model cadangan
            }
        }

        // Jika semua model gagal
        return res.status(500).json({ reply: "Semua jalur visual sibuk atau pindah alamat (410). Coba prompt lain, Dit!" });
    }

    // --- LOGIKA TEKS (Sama seperti sebelumnya) ---
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
