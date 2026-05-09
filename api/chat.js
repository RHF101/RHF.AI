// api/chat.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: 'Chat mode only!' });

    const { prompt } = req.body;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const chatPrompt = `Kamu adalah AI RHF, asisten cerdas. Jawab santai tapi jenius. User bertanya: "${prompt}"`;
        
        const result = await model.generateContent(chatPrompt);
        const response = await result.response;
        
        return res.status(200).json({ 
            success: true, 
            reply: response.text() 
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
