export default async function handler(req, res) {
    const { pesan, isImage } = req.body;
    
    // Pakai model FLUX dari Hugging Face (Gratis & Gacor)
    if (isImage) {
        try {
            const response = await fetch(
                "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
                {
                    headers: { Authorization: "Bearer hf_ISI_TOKEN_HUGGINGFACE_DISINI" }, // Nanti saya bantu cara dapet tokennya
                    method: "POST",
                    body: JSON.stringify({ inputs: pesan }),
                }
            );
            const blob = await response.blob();
            // Convert ke base64 agar bisa tampil di chat
            const buffer = Buffer.from(await blob.arrayBuffer());
            const base64Image = buffer.toString('base64');
            return res.status(200).json({ reply: `data:image/png;base64,${base64Image}`, type: "image" });
        } catch (e) {
            return res.status(500).json({ reply: "Gagal memproses visual." });
        }
    }

    // Bagian Teks (Groq) tetap seperti biasa...
}
