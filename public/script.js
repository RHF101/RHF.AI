const chatContainer = document.getElementById('chat-container');

async function sendChat() {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    if (!text) return;

    // Tampilkan Pesan User (Kanan)
    addMessage(text, 'user');
    input.value = '';

    try {
        // Panggil API Vercel kamu
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pesan: text })
        });

        const data = await response.json();
        
        // Tampilkan Balasan AI (Kiri)
        addMessage(data.reply, 'ai');
    } catch (error) {
        addMessage("Sistem RHF mengalami gangguan. Cek konfigurasi API.", 'ai');
    }
}

function addMessage(content, role) {
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.innerText = content;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}
