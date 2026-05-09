const axios = require('axios');
const FIREBASE_URL = "https://rhf-confrims-default-rtdb.firebaseio.com/perintah_ai.json";

class AIMasterBuilder {
    constructor() {
        this.nodes = [];
    }

    // Fungsi untuk meriset area kerja
    reset() { this.nodes = []; }

    // Fungsi Cerdas: Membuat Barisan (Array)
    buatBarisan(tipe, jumlah, jarak, sumbu = 'x') {
        for (let i = 0; i < jumlah; i++) {
            let pos = [0, 1, 0];
            if (sumbu === 'x') pos[0] = i * jarak;
            if (sumbu === 'z') pos[2] = i * -jarak;
            
            this.nodes.push({
                file: tipe,
                pos: pos,
                scale: [1, 1, 1]
            });
        }
    }

    // Fungsi Cerdas: Membuat Ruangan/Rumah
    buatStruktur(nama) {
        if (nama === "benteng") {
            // Lantai
            this.nodes.push({ file: "lantai", pos: [0, 0, 0], scale: [2, 1, 2] });
            // 4 Pilar di sudut
            const sudut = [[-4, 2, -4], [4, 2, -4], [-4, 2, 4], [4, 2, 4]];
            sudut.forEach(s => {
                this.nodes.push({ file: "tabung", pos: s, scale: [1, 4, 1] });
            });
            // Atap flat
            this.nodes.push({ file: "kotak", pos: [0, 4.5, 0], scale: [5, 0.2, 5] });
        }
    }

    async kirim() {
        try {
            await axios.put(FIREBASE_URL, { nodes: this.nodes });
            console.log("✅ Master Arsitek: Struktur Berhasil Dikirim!");
        } catch (e) {
            console.error("❌ Koneksi Gagal:", e.message);
        }
    }
}

// --- CARA PERINTAH SI MASTER ---
const Jarvis = new AIMasterBuilder();

// Contoh 1: Bikin Benteng Otomatis
Jarvis.buatStruktur("benteng");

// Contoh 2: Tambah barisan bola di samping benteng
Jarvis.buatBarisan("bola", 5, 2, 'z'); 

Jarvis.kirim();
