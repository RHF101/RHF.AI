export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { pesan, history = [] } = req.body;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant", // Model tercepat & paling stabil
                messages: [
                    { role: "system", content: "Kamu adalah RHF-AI, teman bicara yang cerdas, hangat, dan paham psikologi. Jawablah dengan manusiawi." },
                    ...history.slice(-6), // Batasi history agar tidak overload
                    { role: "user", content: pesan }
                ],
                temperature: 0.7
            }),
        });

        const data = await response.json();

        if (data.error) {
            return res.status(200).json({ reply: `Sistem Groq Error: ${data.error.message}` });
        }

        res.status(200).json({ reply: data.choices[0].message.content });

    } catch (error) {
        res.status(500).json({ reply: "Neural Link Error: Cek Koneksi Vercel." });
    }
}
