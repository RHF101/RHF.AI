export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Protokol Ditolak' });
    }

    const { pesan, history = [] } = req.body;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant", // Model paling cepat & stabil
                messages: [
                    {
                        role: "system",
                        content: `Identitas: RHF-AI. Kreator: Radit Tiya.
                        Karakter: Manusiawi, hangat, profesional, dan paham psikologi.
                        Instruksi: Jadilah teman bicara yang membuat nyaman. Jika user bercerita, dengarkan dengan empati. Jika user bertanya teknis, jawab dengan logis. Ingat seluruh konteks percakapan agar user merasa dipahami secara mendalam.`
                    },
                    // Kirim history yang bersih (Filter pesan kosong)
                    ...history.filter(h => h.content).slice(-15),
                    { role: "user", content: pesan }
                ],
                temperature: 0.8, 
                max_tokens: 2048,
                top_p: 1,
                stream: false
            }),
        });

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ reply: "Sistem sibuk, coba sesaat lagi." });
        }

        res.status(200).json({ reply: data.choices[0].message.content });

    } catch (error) {
        res.status(500).json({ reply: "Neural Link terputus. Pastikan API Key aktif." });
    }
}
