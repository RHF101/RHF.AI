        if (isImage) {
            // 1. Bersihkan prompt dari karakter aneh
            const promptBersih = pesan.replace(/[^a-zA-Z0-9 ]/g, "");
            const promptAman = encodeURIComponent(promptBersih);
            
            // 2. Gunakan angka acak (Seed) agar gambar selalu baru
            const seed = Math.floor(Math.random() * 999999);
            
            // 3. RAKIT LINK LANGSUNG (Ini rahasianya agar tidak jadi link web)
            // Kita tambahkan parameter &nologo=true agar tidak ada watermark
            const directImageUrl = `https://image.pollinations.ai/prompt/${promptAman}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;
            
            console.log("Menghasilkan Gambar di:", directImageUrl);

            // 4. Kirim URL ini ke index.html
            return res.status(200).json({ 
                reply: directImageUrl, 
                type: "image" 
            });
        }
