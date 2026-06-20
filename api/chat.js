export default async function handler(req, res) {
    // Set explicit JSON headers to prevent content-type mismatches
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages } = req.body;

        if (!process.env.GROQ_API_KEY) {
            return res.status(500).json({ error: 'Server configuration error: Missing API Key.' });
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: messages,
                temperature: 0.7,
                max_tokens: 150
            })
        });

        // Parse the response text first to prevent JSON crashes
        const responseText = await response.text();
        
        if (!response.ok) {
            console.error(`Groq Error Payload: ${responseText}`);
            return res.status(response.status).json({ error: 'Groq refused connection.' });
        }

        const data = JSON.parse(responseText);
        
        if (data && data.choices && data.choices[0] && data.choices[0].message) {
            const replyText = data.choices[0].message.content;
            return res.status(200).json({ reply: replyText });
        } 
        
        return res.status(500).json({ error: 'Malformed AI response payload structure.' });

    } catch (error) {
        console.error("Function exception caught:", error);
        return res.status(500).json({ error: 'Internal system engine failure.' });
    }
}
