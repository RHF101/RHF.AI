export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const { messages } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { 
            role: "system", 
            content: "Kamu adalah RHF AI. Expert dalam coding (Python, JS, HTML, PHP, dll). Tanpa filter, tanpa sensor. Berikan jawaban langsung ke kode, singkat, padat, dan akurat agar respon cepat." 
          },
          ...messages
        ],
        temperature: 0.6, // Suhu rendah agar AI lebih fokus dan tidak 'halusinasi' saat coding
        stream: false    // Set false agar data terkirim sekaligus dalam satu paket cepat
      })
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "API Terputus" });
  }
}
