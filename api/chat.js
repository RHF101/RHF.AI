export default async function handler(req, res) {
    const groqKey = process.env.GROQ_API_KEY;
    const fbUrl = "https://rhf-confrims-default-rtdb.firebaseio.com/perintah_ai.json";

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { pesan } = req.body;
        if (!pesan) return res.status(200).json({ reply: "Sistem Standby." });

        // OTAK UTAMA: Llama 3.3 70B (Setara Claude versi Gratis & Cepat)
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${groqKey}`,
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { 
                        role: "system", 
                        content: "Kamu AI Arsitek Game. Jika user minta rakit/bangun, balas HANYA JSON murni. Jika tanya biasa, jawab dengan cerdas. Format JSON: {\"nodes\": [{\"name\": \"...\", \"file\": \"...\", \"pos\": [0,0,0], \"rot\": [0,0,0], \"scale\": [1,1,1], \"script\": \"\"}]}" 
                    },
                    { role: "user", content: pesan }
                ],
                temperature: 0.3
            })
        });

        const data = await response.json();
        const output = data.choices?.[0]?.message?.content || "";

        if (!output) throw new Error("AI_KOSONG");

        // DETEKSI OTOMATIS: Apakah ini instruksi rakit atau chat?
        if (output.includes("{") && output.includes("nodes")) {
            const cleanJson = output.replace(/```json|```/g, "").trim();
            
            // Kirim ke Godot (Firebase)
            await fetch(fbUrl, { method: "PUT", body: cleanJson });
            
            return res.status(200).json({ 
                reply: "🏗️ Konstruksi berhasil dikirim ke Godot!", 
                data: JSON.parse(cleanJson) 
            });
        }

        // Kalau cuma ngobrol biasa
        return res.status(200).json({ reply: output });

    } catch (err) {
        return res.status(200).json({ reply: "⚠️ Gangguan Otak: " + err.message });
    }
}
