export default async function handler(req, res) {
    // Protokol Keamanan: Hanya POST yang diizinkan
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Protokol Ditolak. Gunakan POST.' });
    }

    const { pesan, history = [] } = req.body;

    // Validasi Input Dasar
    if (!pesan) {
        return res.status(400).json({ reply: "Sinyal kosong. Masukkan instruksi." });
    }

    try {
        // Konstruksi Neural Message
        // Menggabungkan System Prompt + History (Ingatan) + Pesan Baru
        const messages = [
            {
                role: "system",
                content: `PROTOKOL RHF-CORE AKTIF. 
                Identitas: RHF-AI. 
                Kreator: Radit Tiya. 
                Karakter: Super logis, mewah, profesional, dan cerdas. 
                Instruksi Memori: Ingat semua konteks dari awal. Gunakan format Markdown untuk teknis/koding. 
                Gaya Bahasa: Elegan, dingin, namun memberikan solusi mendalam.`
            },
            // Masukkan sejarah percakapan (maksimal 10 terakhir agar tidak overload)
            ...history.slice(-10).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content || msg.text || ""
            })),
            { role: "user", content: pesan }
        ];

        // Eksekusi Koneksi ke Groq Cloud LPU
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                // Llama 3.3 70B adalah model paling cerdas & stabil saat ini
                model: "llama-3.3-70b-versatile",
                messages: messages,
                temperature: 0.6, // Keseimbangan antara kreativitas dan akurasi
                max_tokens: 4096,
                top_p: 1,
                stream: false
            }),
        });

        const data = await response.json();

        // Handle Error dari API Groq (Misal: API Key Salah atau Kuota Habis)
        if (data.error) {
            console.error("Neural Error:", data.error);
            return res.status(500).json({ 
                reply: `[NEURAL ERROR]: ${data.error.message}. Cek konfigurasi API Key di Vercel.` 
            });
        }

        // Kirim balasan sukses
        res.status(200).json({ 
            reply: data.choices[0].message.content 
        });

    } catch (error) {
        // Handle Error Jaringan atau Server Crash
        console.error("Critical System Failure:", error);
        res.status(500).json({ 
            reply: "FATAL ERROR: Koneksi Neural Engine terputus secara paksa." 
        });
    }
}
