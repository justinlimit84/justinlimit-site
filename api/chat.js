export default async function handler(req, res) {
    // 1. CORS Headers Setup
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { messages, username } = req.body;
        
        if (!username || username.trim() === '' || username.trim() === 'Anonymous User') {
            return res.status(400).json({ error: 'Please log in with a valid Username!' });
        }
        
        const cleanUsername = String(username).trim().toLowerCase();

        // 2. CRASH PROTECTION: Safely read environment variables
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        const groqApiKey = process.env.GROQ_API_KEY;

        if (!groqApiKey || !supabaseUrl || !supabaseKey) {
            return res.status(500).json({ 
                error: 'Backend configuration missing! Please verify your Vercel Environment Variables.' 
            });
        }

        const cleanUrl = supabaseUrl.replace(/\/$/, '');
        let userAllowed = true;
        let includeTriviaThisTurn = false;

        // 3. USER CHECK, DAILY LIMITS & TRIVIA TRACKING
        try {
            const userCheck = await fetch(`${cleanUrl}/rest/v1/user_profiles?username=eq.${encodeURIComponent(cleanUsername)}`, {
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
            });
            const userData = await userCheck.json();

            // Generate a random target turn between 2 and 8 for new users
            const randomTargetTurn = Math.floor(Math.random() * 7) + 2; 

            if (!Array.isArray(userData) || userData.length === 0) {
                // New User Registration: Initialize trivia values
                await fetch(`${cleanUrl}/rest/v1/user_profiles`, {
                    method: 'POST',
                    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                    body: JSON.stringify({ 
                        username: cleanUsername, 
                        messages_sent_today: 1,
                        trivia_target_turn: randomTargetTurn,
                        has_received_trivia: false
                    })
                });
            } else {
                // Limit to 50 messages per day
                const currentCount = userData[0].messages_sent_today;
                if (currentCount >= 50) {
                    userAllowed = false;
                } else {
                    const nextCount = currentCount + 1;
                    const targetTurn = userData[0].trivia_target_turn || randomTargetTurn;
                    const hasReceived = userData[0].has_received_trivia || false;
                    
                    let updatedTriviaFlag = hasReceived;

                    // Evaluate if they hit the target turn or the fallback turn 10 safety line
                    if (!hasReceived && (nextCount === targetTurn || nextCount >= 10)) {
                        includeTriviaThisTurn = true;
                        updatedTriviaFlag = true; // Mark as delivered so they only get one
                    }

                    // Update daily counter and trivia flag
                    await fetch(`${cleanUrl}/rest/v1/user_profiles?username=eq.${encodeURIComponent(cleanUsername)}`, {
                        method: 'PATCH',
                        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            messages_sent_today: nextCount, 
                            has_received_trivia: updatedTriviaFlag,
                            last_message_at: new Date() 
                        })
                    });
                }
            }
        } catch (err) {
            console.error("Supabase profile check bypassed:", err);
        }

        if (!userAllowed) {
            return res.status(403).json({ error: "Training limits reached for today! Come back tomorrow to recharge your energy! ⚡" });
        }

        // 4. AI INFERENCE VIA GROQ
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${groqApiKey.trim()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: messages,
                temperature: 0.7,
                max_tokens: 150
            })
        });

        if (!response.ok) return res.status(500).json({ error: 'Groq inference engine refused connection.' });
        const data = await response.json();
        const replyText = data.choices[0].message.content;

        // 5. REWARD POWER POINTS
        try {
            await fetch(`${cleanUrl}/rest/v1/rpc/increment_power`, {
                method: 'POST',
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ p_username: cleanUsername, p_amount: 10 })
            });
        } catch (dbErr) {
            console.error("Points update failed:", dbErr);
        }

        // 6. PREPARE THE FINAL JSON PAYLOAD
        const finalResponse = { reply: replyText };

        // Append trivia if tracking flagged it for this user turn
        if (includeTriviaThisTurn) {
            finalResponse.trivia = {
                question: "What is the signature technique of the Uchiha clan?",
                options: [
                    "Shadow Clone Jutsu", 
                    "Fire Style: Fireball Jutsu", 
                    "Chidori", 
                    "Rasengan"
                ],
                correct: 1 // Index of the correct option
            };
        }

        return res.status(200).json(finalResponse);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Critical internal server handler failure.' });
    }
}
