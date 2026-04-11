export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST' });

  try {
    const { pesan, isImage } = req.body;

    // --- JALUR GAMBAR (KEMBALIKAN KE SEMULA) ---
    if (isImage === true || isImage === "true") {
      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    // --- JALUR CHAT (GEMINI) ---
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: pesan }]
        }]
      })
    });

    const data = await response.json();

    // Cek apakah ada respon dari Gemini
    if (data.candidates && data.candidates[0].content) {
      const replyText = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ type: "text", reply: replyText });
    } else {
      return res.status(200).json({ type: "text", reply: "Gemini sedang berpikir keras, coba tanya lagi, Dit." });
    }

  } catch (error) {
    // JANGAN LEMPAR ERROR 500, kirim teks saja agar web tidak merah
    return res.status(200).json({ 
      type: "text", 
      reply: "Sistem sedang kalibrasi ulang. Coba kirim ulang ya!" 
    });
  }
}
