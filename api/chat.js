const { GoogleGenerativeAI } = require("@google/generative-ai");

export default async function handler(req, res) {
    // Header wajib agar bisa diakses dari index.html
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const { prompt } = req.body;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(`Kamu adalah RHF-AI. Jawab dengan gaya santai tapi cerdas: ${prompt}`);
        const response = await result.response;
        
        return res.status(200).json({ success: true, reply: response.text() });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
