const axios = require('axios');

// GANTI DENGAN URL FIREBASE KAMU
const BASE_URL = "https://rhf-confrims-default-rtdb.firebaseio.com/perintah_ai";

/**
 * Fungsi untuk memastikan URL selalu diakhiri .json
 * Ini untuk mencegah error "Unexpected token T" (HTML Error)
 */
const getValidUrl = () => BASE_URL.endsWith(".json") ? BASE_URL : `${BASE_URL}.json`;

class AIMasterBuilder {
    constructor() {
        this.nodes = [];
    }

    // Membersihkan antrian perintah
    clear() {
        this.nodes = [];
        return this;
    }

    /**
     * Fungsi untuk menambah objek secara cerdas
     * @param {string} tipe - 'kotak', 'bola', 'lantai', 'tabung'
     * @param {Array} pos - [x, y, z]
     * @param {Array} scale - [x, y, z]
     */
    tambahObjek(tipe, pos = [0, 0, 0], scale = [1, 1, 1]) {
        this.nodes.push({
            file: tipe.toLowerCase(), // Kirim nama murni tanpa .obj
            name: `${tipe}_${this.nodes.length}`,
            pos: pos,
            rot: [0, 0, 0],
            scale: scale
        });
        return this;
    }

    // Fungsi otomatis membuat struktur kompleks
    buatPilar(jumlah, jarak = 4) {
        for (let i = 0; i < jumlah; i++) {
            this.tambahObjek("tabung", [i * jarak, 2, -5], [1, 4, 1]);
        }
        return this;
    }

    // Mengirim data ke Firebase
    async kirim() {
        const payload = { nodes: this.nodes };
        
        try {
            console.log("📤 Mengirim instruksi ke Firebase...");
            const res = await axios.put(getValidUrl(), payload);
            
            if (res.status === 200) {
                console.log("✅ BERHASIL: Instruksi diterima Firebase.");
                console.log("📊 Total Objek:", this.nodes.length);
            }
        } catch (error) {
            console.error("❌ GAGAL:");
            if (error.response) {
                // Server merespon tapi error (misal 404 atau 401)
                console.error(`Status: ${error.response.status}`);
                console.error("Pesan: Pastikan Rules Firebase sudah 'true'");
            } else {
                console.error("Cek koneksi internet atau URL Firebase kamu.");
            }
        }
    }
}

// --- CARA PENGGUNAAN ---
const Arsitek = new AIMasterBuilder();

// Contoh: Membuat Lantai, 3 Pilar, dan 1 Kotak di atasnya
Arsitek.clear()
    .tambahObjek("lantai", [0, 0, 0], [1, 1, 1]) // Dasar
    .buatPilar(3, 5)                             // 3 Tiang biru
    .tambahObjek("kotak", [5, 5, -5], [2, 2, 2])  // Kotak merah melayang
    .kirim();
