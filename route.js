const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "llama3-8b-8192", // Model paling ngebut
    messages: [
      {
        role: "system",
        content: "PROTOKOL RHF-CORE AKTIF. Nama: RHF-AI. Creator: Radit Tiya. Karakter: Maskulin, teknis, minimalis, dan sangat cerdas. Kamu adalah inti dari sistem RHF."
      },
      { role: "user", content: "Halo RHF-AI!" }
    ],
    temperature: 0.7, // Biar gak kaku
    max_tokens: 1024,
  }),
});

const data = await response.json();
console.log(data.choices[0].message.content);
