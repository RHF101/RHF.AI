// api/chat.js
const axios = require('axios');

export default async function handler(req, res) {
    const FIREBASE_URL = "https://rhf-confrims-default-rtdb.firebaseio.com/perintah_ai.json";

    // Agar bisa dipanggil dari web manapun (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Gunakan POST bro!' });
    }

    const { prompt } = req.body;
    let nodes = [];

    // --- LOGIKA "BRAIN" CHAT AI ---
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
    } else if (input.includes("bola")) {
        nodes.push({ file: "bola", pos: [0, 5, 0], scale: [3, 3, 3] });
    } else {
        // Jika perintah umum, buat kotak default
        nodes.push({ file: "kotak", pos: [0, 1, 0], scale: [2, 2, 2] });
    }

    // Selalu tambahkan lantai agar tidak melayang
    nodes.push({ file: "lantai", pos: [0, 0, 0], scale: [1, 1, 1] });

    try {
        await axios.put(FIREBASE_URL, { nodes: nodes });
        return res.status(200).json({ 
            success: true, 
            message: `Selesai membangun: ${input}`,
            total: nodes.length 
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
  
