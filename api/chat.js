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
        const { messages } = req.body;

        // 🌐 SECURE IP EXTRACTION FROM VERCEL HEADERS
        const forwarded = req.headers['x-forwarded-for'];
        const clientIp = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!process.env.GROQ_API_KEY || !supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'Server configuration error: Missing infrastructure keys.' });
        }

        const cleanUrl = supabaseUrl.replace(/\/$/, '');

        // 🛑 GATEKEEPER GUARD: Verify IP limit before touching Groq
        try {
            const limitCheckResponse = await fetch(`${cleanUrl}/rest/v1/rpc/check_user_message_limit`, {
                method: 'POST',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json'
                },
                // 🔄 passing the client IP directly into the Postgres RPC check
                body: JSON.stringify({ p_user_id: String(clientIp) })
            });

            const isAllowed = await limitCheckResponse.json();

            if (!isAllowed) {
                return res.status(403).json({ 
                    error: "You have reached the limit of chat. Please come back again after 30 mins." 
                });
            }
        } catch (gateErr) {
            console.error("Gatekeeper failed to verify user profile, bypassing check safely:", gateErr);
        }

        // 🤖 PROCEED TO GROQ (Only executed if user passed the check above)
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
                const promptTokens = data.usage.prompt_tokens;
                const completionTokens = data.usage.completion_tokens;
                const totalTokens = data.usage.total_tokens;

                console.log(`\n=================== AI USAGE TRACKER ===================`);
                console.log(`🌐 CLIENT IP: ${clientIp}`);
                console.log(`🎟️ PROMPT TOKENS: ${promptTokens}`);
                console.log(`✍️ COMPLETION TOKENS: ${completionTokens}`);
                console.log(`📈 TOTAL TOKENS: ${totalTokens}`);
                console.log(`========================================================\n`);

                try {
                    const targetUrl = `${cleanUrl}/rest/v1/rpc/log_tokens`;
                    const dbResponse = await fetch(targetUrl, {
                        method: 'POST',
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        // 🔄 Logging data directly against the unique client IP
                        body: JSON.stringify({
                            p_user_id: String(clientIp),
                            p_prompt_tokens: Number(promptTokens) || 0,
                            p_completion_tokens: Number(completionTokens) || 0,
                            p_total_tokens: Number(totalTokens) || 0
                        })
                    });

                    const dbText = await dbResponse.text();
                    console.log(`Supabase Response Status: ${dbResponse.status}`);
                    
                    if (!dbResponse.ok) {
                        console.error(`Supabase Sync Rejection Payload: ${dbText}`);
                    } else {
                        console.log(`Supabase DB Sync Completed Successfully.`);
                    }
                } catch (dbErr) {
                    console.error("Database network pipe failed entirely:", dbErr);
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
