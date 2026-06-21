export default async function handler(req, res) {
    // Set explicit JSON headers to prevent content-type mismatches
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 🔥 FIX: Destructure both messages AND username from the request body
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

        // Parse the response text first to prevent JSON crashes
        const responseText = await response.text();

        if (!response.ok) {
            console.error('Groq Error Payload:', responseText);
            return res.status(response.status).json({ error: 'Groq refused connection.' });
        }

        const data = JSON.parse(responseText);

        if (data && data.choices && data.choices[0] && data.choices[0].message) {
            const replyText = data.choices[0].message.content;

            // 📊 THE TRACKING LOG & DATABASE SYNC MAGIC:
            if (data.usage) {
                const currentUser = username || 'Anonymous User';
                const promptTokens = data.usage.prompt_tokens;
                const completionTokens = data.usage.completion_tokens;
                const totalTokens = data.usage.total_tokens;

                // 1. Keep your existing Vercel terminal logs running
                console.log(`\n=================== AI USAGE TRACKER ===================`);
                console.log(`👤 USER ID: ${currentUser}`);
                console.log(`🎟️ PROMPT TOKENS: ${promptTokens}`);
                console.log(`✍️ COMPLETION TOKENS: ${completionTokens}`);
                console.log(`📈 TOTAL TOKENS: ${totalTokens}`);
                console.log(`========================================================\n`);

                // 2. Stream log data straight out to Supabase database Rest API
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

                if (supabaseUrl && supabaseKey) {
                    fetch(`${supabaseUrl}/rest/v1/token_logs`, {
                        method: 'POST',
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({
                            user_id: currentUser,
                            prompt_tokens: promptTokens,
                            completion_tokens: completionTokens,
                            total_tokens: totalTokens
                        })
                    }).catch(err => console.error("Error writing to Supabase logs:", err));
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
