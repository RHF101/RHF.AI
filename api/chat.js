export default async function handler(req, res) {
  // 1. SETUP HEADER (CORS & Keamanan)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const { pesan, isImage, history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // --- JALUR VISUAL (FLUX ENGINE - SUPER FAST) ---
    if (isImage === true || isImage === "true") {
      const seed = Math.floor(Math.random() * 1000000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pesan)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
      return res.status(200).json({ type: "image", reply: imageUrl });
    }

    // --- JALUR OTAK (GEMINI NEURAL LINK V1) ---
    // Membersihkan history agar formatnya pas untuk Google API
    const cleanHistory = (history || [])
      .filter(item => item.content && item.content.trim() !== "")
      .map(item => ({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: item.content }]
      }))
      .slice(-10); // Ambil 10 pesan terakhir saja agar tidak overload

    // Memanggil Google API Versi v1 (Paling Stabil)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          // Instruksi Permanen agar AI selalu ingat perannya
          { 
            role: "user", 
            parts: [{ text: "Kamu adalah RHF-AI Omni-Core v3.0, sistem cerdas ciptaan Radit Tiya. Kamu ahli dalam Coding, Web Engineering, dan Android Modding. Jawablah instruksi Radit dengan sangat teliti, teknis, dan rapi." }] 
          },
          { 
            role: "model", 
            parts: [{ text: "Siap, Radit Tiya. Omni-Core v3.0 Aktif. Saya siap membantu proyek kamu dengan presisi tinggi." }] 
          },
          ...cleanHistory,
          { role: "user", parts: [{ text: pesan }] }
        ],
        generationConfig: { 
          temperature: 0.7, 
          topP: 0.95,
          maxOutputTokens: 4096 // Kuota token lebih besar untuk kodingan panjang
        }
      })
    });

    const data = await response.json();
    
    // PENANGANAN HASIL
    if (data.candidates && data.candidates[0].content) {
      const text = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ type: "text", reply: text });
    } else if (data.error) {
      // Jika terjadi error teknis dari Google
      return res.status(200).json({ 
        type: "text", 
        reply: `SYSTEM ERROR [${data.error.status}]: ${data.error.message}` 
      });
    } else {
      return res.status(200).json({ 
        type: "text", 
        reply: "Neural Link Limit tercapai. Coba beberapa saat lagi atau cek kuota API di Google AI Studio, Dit!" 
      });
    }

  } catch (err) {
    // PENYELAMATAN JIKA SERVER DOWN
    console.error("Critical Error:", err);
    return res.status(200).json({ 
      type: "text", 
      reply: "Sistem Offline. Pastikan GEMINI_API_KEY sudah benar di Vercel Settings dan lakukan Redeploy." 
    });
  }
        }
        
