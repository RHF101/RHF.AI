// File: route.js (Taruh di root atau di dalam folder api sebagai cadangan)

export async function POST(request) {
    try {
        const body = await request.json();
        const { pesan, isImage, history } = body;
        const API_KEY = process.env.GROQ_API_KEY;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama3-70b-8192",
                messages: [
                    { role: "system", content: "Omni-Core Neural Route Active." },
                    ...history,
                    { role: "user", content: pesan }
                ],
                temperature: 0.5
            })
        });

        const data = await response.json();
        return new Response(JSON.stringify({ 
            type: "text", 
            reply: data.choices[0].message.content 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: "Route offline" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
