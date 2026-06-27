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
        const { messages, username, character } = req.body;
        const selectedChar = character || "Goku"; 
        
        if (!username || username.trim() === '' || username.trim() === 'Anonymous User') {
            return res.status(400).json({ error: 'Please log in with a valid Username!' });
        }
        
        const cleanUsername = String(username).trim().toLowerCase();

        // 2. CRASH PROTECTION: Environment Variables
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

        // 3. DATABASE CHECK & TURN TRACKING (Enforces 1 Random Trivia after start)
        try {
            const userCheck = await fetch(`${cleanUrl}/rest/v1/user_profiles?username=eq.${encodeURIComponent(cleanUsername)}`, {
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
            });
            const userData = await userCheck.json();

            // Pick a truly random target turn between prompt 3 and prompt 8 (never at the start)
            const randomTargetTurn = Math.floor(Math.random() * 6) + 3; 

            if (!Array.isArray(userData) || userData.length === 0) {
                // New User Registration
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
                const currentCount = userData[0].messages_sent_today;
                if (currentCount >= 50) {
                    userAllowed = false;
                } else {
                    const nextCount = currentCount + 1;
                    const targetTurn = userData[0].trivia_target_turn || randomTargetTurn;
                    const hasReceived = userData[0].has_received_trivia || false;
                    
                    let updatedTriviaFlag = hasReceived;

                    // Triggers randomly between turns 3-8, or pushes a fallback at turn 10 max
                    if (!hasReceived && (nextCount === targetTurn || nextCount >= 10)) {
                        includeTriviaThisTurn = true;
                        updatedTriviaFlag = true; 
                    }

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
            console.error("Supabase check error:", err);
        }

        if (!userAllowed) {
            return res.status(403).json({ error: "Training limits reached for today! Come back tomorrow to recharge your energy! ⚡" });
        }

        // 4. CHOOSE INFERENCE INSTRUCTIONS BASED ON STATE
        let finalMessages = [...messages];
        let responseFormatConfig = undefined;

        if (includeTriviaThisTurn) {
            // Append short hidden modifier instructing a temporary JSON payload structure
            finalMessages.push({
                role: "system",
                content: `You must generate a random trivia question related to your character (${selectedChar}) or universe. Respond strictly with a JSON object format matching this layout:
                {
                   "reply": "Your conversational in-character message text here",
                   "trivia": {
                      "question": "The trivia question text",
                      "options": ["Opt 0", "Opt 1", "Opt 2", "Opt 3"],
                      "correct": 0
                   }
                }`
            });
            responseFormatConfig = { type: "json_object" };
        }

        // 5. AI INFERENCE VIA GROQ
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${groqApiKey.trim()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: finalMessages,
                temperature: 0.8,
                max_tokens: 300,
                response_format: responseFormatConfig
            })
        });

        if (!response.ok) return res.status(500).json({ error: 'Groq inference engine refused connection.' });
        const data = await response.json();
        const rawContent = data.choices[0].message.content.trim();

        // 6. SANITIZE AND CONSTRUCT RESPONSE SEPARATELY
        let finalResponse = { reply: rawContent };

        if (includeTriviaThisTurn) {
            try {
                const parsedJSON = JSON.parse(rawContent);
                // We overwrite the reply to clean conversational text before history logs it!
                finalResponse.reply = parsedJSON.reply || `Let's see if you can answer this!`;
                if (parsedJSON.trivia) {
                    finalResponse.trivia = parsedJSON.trivia;
                }
            } catch (jsonErr) {
                console.error("JSON parsing fallback execution.", jsonErr);
                finalResponse.reply = "Let's see how much you know about my world!";
                finalResponse.trivia = {
                    question: `Are you a true fan of ${selectedChar}?`,
                    options: ["Yes!", "Of course!", "Unsure", "No"],
                    correct: 0
                };
            }
        }

        // 7. REWARD POWER POINTS
        try {
            await fetch(`${cleanUrl}/rest/v1/rpc/increment_power`, {
                method: 'POST',
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ p_username: cleanUsername, p_amount: 10 })
            });
        } catch (dbErr) {
            console.error("Points update failed:", dbErr);
        }

        // The frontend will now receive a clean conversational string inside finalResponse.reply 
        // to pass along into its history loop, preventing any endless formatting cascades.
        return res.status(200).json(finalResponse);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Critical internal server handler failure.' });
    }
}
