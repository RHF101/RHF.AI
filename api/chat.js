export default async function handler(req, res) {
  const { pesan } = req.body;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content: "PROTOKOL RHF-CORE AKTIF. Kamu adalah RHF-AI, sistem cerdas buatan Radit Tiya. Gaya bahasa: Singkat, padat, teknis, dan elegan. Jangan gunakan emoji berlebihan."
        },
        { role: "user", content: pesan }
      ],
      temperature: 0.6,
    }),
  });

  const data = await response.json();
  res.status(200).json({ reply: data.choices[0].message.content });
}
