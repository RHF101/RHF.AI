export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { pesan, history = [] } = req.body;

    // Pastikan API Key terbaca
    if (!process.env.GROQ_API_KEY) {
        return res.status(200).json({ reply: "[ERROR]: API Key tidak ditemukan di Environment Variables Vercel." });
    }

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY.trim()}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant", 
                messages: [
                    { role: "system", content: "Kamu adalah RHF-AI. Jawab dengan cerdas, hangat, dan empati." },
                    ...history.slice(-8), 
                    { role: "user", content: pesan }
                ],
                temperature: 0.7
            }),
        });

        const data = await response.json();

        if (data.error) {
            // Jika Groq menolak, dia akan kasih tahu alasannya di sini
            return res.status(200).json({ reply: `[GROQ ERROR]: ${data.error.message}` });
        }

        if (!data.choices || data.choices.length === 0) {
            return res.status(200).json({ reply: "[ERROR]: Respon kosong dari AI." });
        }

        res.status(200).json({ reply: data.choices[0].message.content });

    } catch (error) {
        res.status(500).json({ reply: `[SERVER ERROR]: ${error.message}` });
    }
}
