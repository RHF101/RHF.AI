const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    
    const { prompt } = req.body;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const FIREBASE_URL = `https://${process.env.VITE_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com/perintah_ai.json`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Step 1: AI Membuat data JSON untuk Godot
        const buildPrompt = `Ubah instruksi ini: "${prompt}" menjadi JSON murni untuk Godot. 
        Format: {"nodes": [{"file": "kotak|bola|tabung|lantai", "pos": [x,y,z], "scale": [x,y,z], "script": "GDScript"}]}
        Gunakan teknik tumpuk yang teliti. JANGAN ADA TEKS LAIN.`;

        const resultBuild = await model.generateContent(buildPrompt);
        const responseBuild = await resultBuild.response;
        const jsonText = responseBuild.text().replace(/```json|```/g, "").trim();
        const nodesData = JSON.parse(jsonText);

        // Step 2: Kirim data ke Firebase
        await axios.put(FIREBASE_URL, nodesData);

        // Step 3: AI membuat ucapan keberhasilan sendiri (Dinamis)
        const successPrompt = `Berikan satu kalimat singkat dan asik bahwa kamu baru saja selesai merakit "${prompt}" di Godot.`;
        const resultTalk = await model.generateContent(successPrompt);
        const responseTalk = await resultTalk.response;

        return res.status(200).json({ 
            success: true, 
            message: responseTalk.text(), // Ini hasil omongan AI, bukan manual
            total: nodesData.nodes.length 
        });

    } catch (error) {
        return res.status(500).json({ success: false, error: "Gagal ngerakit: " + error.message });
    }
}
