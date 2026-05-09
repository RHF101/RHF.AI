// api/generate.js
const axios = require('axios');

export default async function handler(req, res) {
    // URL Firebase kamu
    const FIREBASE_URL = "https://rhf-confrims-default-rtdb.firebaseio.com/perintah_ai.json";

    // Proteksi: Hanya terima metode POST (biar aman)
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Gunakan metode POST bro!' });
    }

    const { tipe_bangunan, skala_global } = req.body;
    let nodes = [];

    // --- LOGIKA MASTER ARSITEK ---
    if (tipe_bangunan === "piramida") {
        const tinggi = 5;
        for (let y = 0; y < tinggi; y++) {
            let lebar = tinggi - y;
            for (let x = 0; x < lebar; x++) {
                for (let z = 0; z < lebar; z++) {
                    let offset = y; 
                    nodes.push({
                        file: "kotak",
                        pos: [(x * 2) + offset, y * 2, (z * -2) - offset],
                        scale: [1.8, 1.8, 1.8]
                    });
                }
            }
        }
    } else if (tipe_bangunan === "pilar") {
        for (let i = 0; i < 4; i++) {
            nodes.push({ file: "tabung", pos: [i * 5, 2, 0], scale: [1, 4, 1] });
        }
        nodes.push({ file: "lantai", pos: [0, 0, 0], scale: [1, 1, 1] });
    } else {
        // Default jika tidak ada tipe: Satu kotak
        nodes.push({ file: "kotak", pos: [0, 1, 0], scale: [2, 2, 2] });
        nodes.push({ file: "lantai", pos: [0, 0, 0], scale: [1, 1, 1] });
    }

    // --- PENGIRIMAN KE FIREBASE ---
    try {
        await axios.put(FIREBASE_URL, { nodes: nodes });
        
        return res.status(200).json({ 
            success: true, 
            message: `Berhasil merakit ${tipe_bangunan}!`,
            total_objek: nodes.length 
        });
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
              }
