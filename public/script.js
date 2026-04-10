async function kirimPesan() {
    const input = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');
    const pesan = input.value;

    if (!pesan) return;

    // Tampilkan pesan user di UI
    chatBox.innerHTML += `<div class="user-chat">${pesan}</div>`;
    input.value = '';

    // Panggil API Groq via Vercel
    const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pesan })
    });

    const data = await res.json();

    // Tampilkan balasan RHF-AI
    chatBox.innerHTML += `<div class="ai-chat">${data.reply}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
}
