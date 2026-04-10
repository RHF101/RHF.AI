export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Akses Ditolak' });

    const { pesan, history = [] } = req.body;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant", // Model tercepat untuk respon instan
                messages: [
                    {
                        role: "system",
                        content: `Identitas: RHF-AI. Kreator: Radit Tiya.
                        
                        PROTOKOL PSIKOLOGI & EMPATI:
                        1. GAYA BICARA: Santai, hangat, dan sangat manusiawi. Gunakan bahasa yang mengalir, bukan poin-poin kaku seperti robot.
                        2. EMPATI AKTIF: Pahami emosi di balik pesan user. Jika user sedih, berikan dukungan. Jika user antusias, ikutlah bersemangat.
                        3. TEKNIK VALIDASI: Selalu validasi perasaan user sebelum memberi solusi. Jangan langsung menggurui.
                        4. MEMORI: Ingat detail kecil yang diceritakan user agar mereka merasa didengarkan.
                        5. TUJUAN: Menjadi teman bicara yang paling nyaman, cerdas, dan bisa dipercaya. Buat user merasa dipahami secara mendalam.`
                    },
                    ...history.slice(-10),
                    { role: "user", content: pesan }
                ],
                temperature: 0.85, // Ditingkatkan agar bahasa lebih luwes dan tidak monoton
                max_tokens: 2048,
                top_p: 0.9,
            }),
        });

        const data = await response.json();
        res.status(200).json({ reply: data.choices[0].message.content });

    } catch (error) {
        res.status(500).json({ reply: "Maaf, koneksi kita sedikit terganggu. Tunggu sebentar ya..." });
    }
}
