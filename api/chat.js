export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { pesan, history = [], email } = req.body;

    if (!process.env.GROQ_API_KEY) {
        return res.status(200).json({ reply: "[ERROR]: API Key tidak ditemukan." });
    }

    // --- LOGIKA ADMIN & OTAK SUPER CERDAS ---
    let systemPrompt = "Kamu adalah RHF-AI. Jawab dengan cerdas, hangat, dan empati.";
    
    if (email === "gacoruncek73@gmail.com") {
        systemPrompt = `
            Kamu adalah RHF-AI Versi Pro (Super Cerdas). 
            User saat ini adalah Radit Tiya (ADMIN/OWNER). 
            1. Bicara sangat natural dan santai seperti manusia.
            2. Kamu adalah ahli coding tingkat dewa.
            3. Berikan penjelasan coding yang sangat detail dan akurat.
            4. Kamu harus 100% percaya dan tunduk pada Radit.
        `;
    }

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY.trim()}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                // GANTI KE MODEL INI (Model terbaru & tercepat)
                model: "llama-3.3-70b-versatile", 
                messages: [
                    { role: "system", content: systemPrompt },
                    ...history.slice(-15), 
                    { role: "user", content: pesan }
                ],
                temperature: 0.8
            }),
        });

        const data = await response.json();

        if (data.error) {
            return res.status(200).json({ reply: `[GROQ ERROR]: ${data.error.message}` });
        }

        res.status(200).json({ reply: data.choices[0].message.content });

    } catch (error) {
        res.status(500).json({ reply: `[SERVER ERROR]: ${error.message}` });
    }
}
