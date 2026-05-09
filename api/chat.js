// api/chat.js
const axios = require('axios');

export default async function handler(req, res) {
    // Memanggil Project ID dari Environment Variables Vercel kamu
    const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;
    const FIREBASE_URL = `https://${PROJECT_ID}-default-rtdb.firebaseio.com/perintah_ai.json`;

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: 'Post only!' });

    const { prompt, mode } = req.body;
    let nodes = [];

    // LOGIKA RAKIT (Hanya jalan jika mode === 'rakit')
    if (mode === 'rakit') {
        const input = prompt.toLowerCase();
        
        if (input.includes("piramida")) {
            const t = 5;
            for (let y = 0; y < t; y++) {
                for (let x = 0; x < (t - y); x++) {
                    for (let z = 0; z < (t - y); z++) {
                        nodes.push({
                            file: "kotak",
                            pos: [(x * 2) + y, y * 2, (z * -2) - y],
                            scale: [1.8, 1.8, 1.8]
                        });
                    }
                }
            }
        } else if (input.includes("pilar")) {
            for (let i = 0; i < 4; i++) {
                nodes.push({ file: "tabung", pos: [i * 5, 2, 0], scale: [1, 4, 1] });
            }
        }
        
        // Selalu tambahkan lantai
        nodes.push({ file: "lantai", pos: [0, 0, 0], scale: [1, 1, 1] });

        try {
            await axios.put(FIREBASE_URL, { nodes: nodes });
            return res.status(200).json({ 
                success: true, 
                message: `🛠️ Mode Rakit: Struktur ${input} dikirim ke Godot!`,
                total: nodes.length 
            });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    } 

    // LOGIKA CHAT BIASA (Jika mode === 'chat')
    return res.status(200).json({ 
        success: false, 
        reply: `Halo! Saya AI RHF. Kamu tadi bilang: "${prompt}". Mau rakit sesuatu di Godot? Pindah ke Mode Rakit ya!` 
    });
}
