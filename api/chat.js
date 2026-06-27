import { createClient } from '@supabase/supabase-base-js'; // Ensure you are using npm package or direct HTTP requests

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { messages, username } = req.body;
        if (!username || username.trim() === 'Anonymous User') {
            return res.status(400).json({ error: 'Please log in with a valid Username!' });
        }
        
        const cleanUsername = String(username).trim().toLowerCase();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!process.env.GROQ_API_KEY || !supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'Server infrastructure configuration keys missing.' });
        }

        // Initialize Supabase Client manually or via HTTP Rest endpoint
        const cleanUrl = supabaseUrl.replace(/\/$/, '');
        
        // 🛑 USER CHECK & ENGINE GUARD (Replaces IP limits with Username Limits)
        // Check if user exists, if not, create them seamlessly
        let userAllowed = true;
        try {
            const userCheck = await fetch(`${cleanUrl}/rest/v1/user_profiles?username=eq.${encodeURIComponent(cleanUsername)}`, {
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
            });
            const userData = await userCheck.json();

            if (userData.length === 0) {
                // New User Registration
                await fetch(`${cleanUrl}/rest/v1/user_profiles`, {
                    method: 'POST',
                    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                    body: JSON.stringify({ username: cleanUsername, messages_sent_today: 1 })
                });
            } else {
                // Rate limit validation check (e.g., max 50 chats a day for kids' safety)
                if (userData[0].messages_sent_today >= 50) {
                    userAllowed = false;
                } else {
                    // Increment message count
                    await fetch(`${cleanUrl}/rest/v1/user_profiles?username=eq.${encodeURIComponent(cleanUsername)}`, {
                        method: 'PATCH',
                        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ messages_sent_today: userData[0].messages_sent_today + 1, last_message_at: new Date() })
                    });
                }
            }
        } catch (err) {
            console.error("Profile protection pipe failed, bypassing to preserve UX:", err);
        }

        if (!userAllowed) {
            return res.status(403).json({ error: "Training limits reached for today! Come back tomorrow to recharge your energy! ⚡" });
        }

        // 🤖 INFERENCE VIA GROQ
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: messages,
                temperature: 0.7,
                max_tokens: 150
            })
        });

        if (!response.ok) return res.status(500).json({ error: 'Groq connection refused.' });
        const data = await response.json();
        const replyText = data.choices[0].message.content;

        // 🎖️ BONUS SYSTEM: Reward kids with +10 Power Level Points for every interaction
        try {
            await fetch(`${cleanUrl}/rest/v1/rpc/increment_power`, {
                method: 'POST',
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ p_username: cleanUsername, p_amount: 10 })
            });
        } catch (dbErr) {
            console.error("Points pipeline failed:", dbErr);
        }

        return res.status(200).json({ reply: replyText });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal system structural failure.' });
    }
}
