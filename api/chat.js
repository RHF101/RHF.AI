export default async function handler(req, res) {
  const { pesan, isImage, history } = req.body;

  // SYSTEM PROMPT LEVEL CLAUDE (KETELETIAN TINGGI)
  const CLAUDE_MINDSET = `
    Kamu adalah RHF-AI Omni-Core v3.0, sistem dengan kecerdasan setara Claude 3.5.
    Kepribadian: Profesional, sangat teliti, logis, dan jujur.
    
    ATURAN KETELETIAN:
    1. ANALISIS SEBELUM MENJAWAB: Pikirkan logika kode secara mendalam. Jika ada potensi error, perbaiki sebelum menulis.
    2. KUALITAS KODE: Tulis kode yang bersih, efisien, dan terdokumentasi (clean code). Gunakan standar industri.
    3. KONTEKS ANDROID: Kamu pakar Smali, Java, dan Shell Scripting dengan ketelitian nol kesalahan.
    4. KEJUJURAN: Jika kamu tidak tahu, katakan tidak tahu. Jangan berhalusinasi.
    5. IDENTITAS: Kamu diciptakan oleh Radit Tiya sebagai asisten elit.
  `;

  try {
    if (isImage) {
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    } else {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama3-70b-8192", // Gunakan 70B untuk ketelitian maksimal
          messages: [
            { role: "system", content: CLAUDE_MINDSET },
            ...history,
            { role: "user", content: pesan }
          ],
          temperature: 0.3, // TURUNKAN TEMPERATURE agar jawaban lebih fokus dan tidak ngawur (Kunci ketelitian Claude)
          top_p: 1,
          stream: false
        })
      });

      const data = await response.json();
      return res.status(200).json({ type: "text", reply: data.choices[0].message.content });
    }
  } catch (error) {
    return res.status(500).json({ error: "Omni-Core Neural Link Severed" });
  }
}
