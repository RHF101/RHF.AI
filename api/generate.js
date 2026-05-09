// api/generate.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const FIREBASE_URL = `https://${process.env.VITE_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com/perintah_ai.json`;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    
    const { prompt } = req.body;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const systemPrompt = `
        Tugas: Jadi Arsitek Godot Super Teliti.
        Instruksi: "${prompt}"
        Output: JSON murni {"nodes": [{"file": "kotak|bola|tabung|lantai", "pos": [x,y,z], "scale": [x,y,z], "script": "GDScript Source"}]}
        Aturan: Pakai teknik layering/tumpuk untuk benda kompleks. JANGAN ADA TEKS LAIN.
        `;

        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        let jsonText = response.text().replace(/```json/g, '').replace(/```/g, '').trim();

        const nodesData = JSON.parse(jsonText);
        
        // Kirim ke Firebase Real-time
        await axios.put(FIREBASE_URL, nodesData);

        return res.status(200).json({ 
            success: true, 
            message: `🛠️ Struktur Rakit Berhasil Dikirim!`,
            total: nodesData.nodes.length
        });
    } catch (error) {
        return res.status(500).json({ error: "Gagal ngerakit: " + error.message });
    }
}
