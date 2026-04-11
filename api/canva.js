// api/canva.js
export default async function handler(req, res) {
    const kid = process.env.CANVA_KID;
    const publicKey = process.env.CANVA_PUBLIC_KEY;

    // Logika untuk verifikasi Webhook atau integrasi asset
    if (req.method === 'POST') {
        // AI kamu nanti kirim perintah ke sini untuk upload asset/desain
        res.status(200).json({ status: "Connected to RHF Neural Sync", key_active: kid });
    } else {
        res.status(200).json({ message: "RHF-Canva Bridge is Online" });
    }
}
