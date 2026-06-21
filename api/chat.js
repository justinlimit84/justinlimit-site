export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages, username } = req.body;

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

        const responseText = await response.text();

        if (!response.ok) {
            console.error('Groq Error Payload:', responseText);
            return res.status(response.status).json({ error: 'Groq refused connection.' });
        }

        const data = JSON.parse(responseText);

        if (data && data.choices && data.choices[0] && data.choices[0].message) {
            const replyText = data.choices[0].message.content;

            if (data.usage) {
                const currentUser = username || 'Anonymous User';
                const promptTokens = data.usage.prompt_tokens;
                const completionTokens = data.usage.completion_tokens;
                const totalTokens = data.usage.total_tokens;

                console.log(`\n=================== AI USAGE TRACKER ===================`);
                console.log(`👤 USER ID: ${currentUser}`);
                console.log(`🎟️ PROMPT TOKENS: ${promptTokens}`);
                console.log(`✍️ COMPLETION TOKENS: ${completionTokens}`);
                console.log(`📈 TOTAL TOKENS: ${totalTokens}`);
                console.log(`========================================================\n`);

                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

                if (supabaseUrl && supabaseKey) {
                    try {
                        // ⚡ Switch path to /rest/v1/rpc/log_tokens for direct internal stream execution
                        await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/log_tokens`, {
                            method: 'POST',
                            headers: {
                                'apikey': supabaseKey,
                                'Authorization': `Bearer ${supabaseKey}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                p_user_id: currentUser,
                                p_prompt_tokens: parseInt(promptTokens, 10),
                                p_completion_tokens: parseInt(completionTokens, 10),
                                p_total_tokens: parseInt(totalTokens, 10)
                            })
                        });
                    } catch (dbErr) {
                        console.error("Database sync pipe failed:", dbErr);
                    }
                }
            }

            return res.status(200).json({ reply: replyText });
        }

        return res.status(500).json({ error: 'Malformed AI response payload structure.' });

    } catch (error) {
        console.error('Function exception caught:', error);
        return res.status(500).json({ error: 'Internal system engine failure.' });
    }
}
