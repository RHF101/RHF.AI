// Ganti isi file api/chat.js kamu jadi ini

export default async function handler(req, res) {
    const { pesan } = req.body;
    
    // Kita pakai model Flux-Schnell untuk bikin gambar
    // Ganti API Key ini dengan API Key Model Gambar kamu (misal dari Together.ai atau HuggingFace)
    const IMAGE_API_KEY = "SESUAIKAN_DENGAN_API_KEY_MODEL_GAMBAR_KAMU"; 

    try {
        const response = await fetch("https://api.together.xyz/v1/images/generations", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${IMAGE_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "black-forest-labs/FLUX.1-schnell-Free", // Pakai Flux Schnell
                prompt: "Visualize: " + pesan, // Kirim deskripsi dari user
                width: 1024,
                height: 1024,
                steps: 4, // Flux Schnell cuma butuh 4 steps
                n: 1,
                response_format: "url"
            }),
        });

        const data = await response.json();
        const imageUrl = data.data[0].url; // Ambil URL gambar hasil render

        // Kirim link gambar kembali ke frontend
        res.status(200).json({ reply: imageUrl, type: "image" });

    } catch (error) {
        res.status(500).json({ reply: "Error: Gagal memproses gambar." });
    }
}
