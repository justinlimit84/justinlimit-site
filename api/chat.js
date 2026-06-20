export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages } = req.body;

        // Verify that the environment variable exists
        if (!process.env.GROQ_API_KEY) {
            console.error("ERROR: GROQ_API_KEY is missing from Vercel Environment Variables!");
            return res.status(500).json({ error: 'API key setup incomplete on server.' });
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3-8b-8192',
                messages: messages,
                temperature: 0.7,
                max_tokens: 150
            })
        });

        // If Groq rejects the request, log what went wrong
        if (!response.ok) {
            const errorData = await response.text();
            console.error(`Groq API Error Status ${response.status}:`, errorData);
            return res.status(response.status).json({ error: 'Groq API rejected request.' });
        }

        const data = await response.json();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const replyText = data.choices[0].message.content;
            return res.status(200).json({ reply: replyText });
        } else {
            console.error("Unexpected Groq response structure:", data);
            return res.status(500).json({ error: 'Invalid response format received from AI provider.' });
        }

    } catch (error) {
        console.error("Serverless Function Exception:", error);
        return res.status(500).json({ error: 'Server scaling exception' });
    }
}
