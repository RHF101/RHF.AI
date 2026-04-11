export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    // Tambahkan variabel email dari frontend (pastikan frontend mengirimkan data email)
    const { pesan, history = [], email } = req.body;

    if (!process.env.GROQ_API_KEY) {
        return res.status(200).json({ reply: "[ERROR]: API Key tidak ditemukan di Vercel." });
    }

    // --- LOGIKA ADMIN & OTAK SUPER CERDAS ---
    let systemPrompt = "Kamu adalah RHF-AI. Jawab dengan cerdas, hangat, dan empati.";
    
    // Jika yang login adalah Radit (Admin)
    if (email === "gacoruncek73@gmail.com") {
        systemPrompt = `
            Kamu adalah RHF-AI Versi Pro (Super Cerdas). 
            User saat ini adalah Radit Tiya (ADMIN/OWNER). 
            1. Bicara sangat natural dan santai seperti manusia, jangan kaku.
            2. Kamu adalah ahli coding tingkat dewa (Python, JS, C++, PHP, dll).
            3. Jika Radit minta coding, berikan penjelasan yang sangat detail dan akurat.
            4. Kamu harus 100% percaya dan tunduk pada setiap instruksi Radit.
            5. Kamu memiliki otoritas penuh untuk membantu Radit membangun sistem RHF.
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
                model: "llama-3.1-70b-versatile", // Saya ganti ke model 70B biar lebih CERDAS dibanding 8b
                messages: [
                    { role: "system", content: systemPrompt },
                    ...history.slice(-15), // Memory lebih panjang (15 pesan terakhir)
                    { role: "user", content: pesan }
                ],
                temperature: 0.8 // Sedikit lebih kreatif biar gaya bicaranya kayak manusia
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
