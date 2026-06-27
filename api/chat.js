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

        // 3. DATABASE CHECK & TURN TRACKING (1-10 Prompt Rule)
        try {
            const userCheck = await fetch(`${cleanUrl}/rest/v1/user_profiles?username=eq.${encodeURIComponent(cleanUsername)}`, {
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
            });
            const userData = await userCheck.json();

            const randomTargetTurn = Math.floor(Math.random() * 7) + 2; // Target turn between 2 and 8

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

                    // Trigger EXACTLY ONCE within the first 10 prompts
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

        // 4. PREPARE PROMPT FOR THE AI
        // If it's time for trivia, we instruct the LLM to output valid JSON combining the response and trivia.
        let finalMessages = [...messages];
        
        if (includeTriviaThisTurn) {
            finalMessages.push({
                role: "system",
                content: `CRITICAL INSTRUCTION: On this specific turn, you must generate a random, fun trivia question related to your character (${selectedChar}) or your anime universe. Your entire response MUST be formatted strictly as a JSON object with this structure:
                {
                   "reply": "Your conversational character response here...",
                   "trivia": {
                      "question": "The trivia question text here...",
                      "options": ["Option 0", "Option 1", "Option 2", "Option 3"],
                      "correct": 0
                   }
                }
                Make sure "correct" is the integer index (0-3) of the right option. Do not include any extra text outside the JSON block.`
            });
        }

        // 5. AI INFERENCE VIA GROQ
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${groqApiKey.trim()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: finalMessages,
                temperature: 0.8, // Slightly higher for more random/creative questions
                max_tokens: 300,
                response_format: includeTriviaThisTurn ? { type: "json_object" } : undefined // Forces JSON output if trivia turn
            })
        });

        if (!response.ok) return res.status(500).json({ error: 'Groq inference engine refused connection.' });
        const data = await response.json();
        const rawContent = data.choices[0].message.content.trim();

        // 6. PROCESS AND PARSE RESPONSE
        let finalResponse = { reply: rawContent };

        if (includeTriviaThisTurn) {
            try {
                // Parse the forced JSON schema from the LLM
                const parsedJSON = JSON.parse(rawContent);
                finalResponse.reply = parsedJSON.reply || `I am ready to test you!`;
                if (parsedJSON.trivia) {
                    finalResponse.trivia = parsedJSON.trivia;
                }
            } catch (jsonErr) {
                console.error("Failed to parse LLM structured trivia JSON. Falling back.", jsonErr);
                // Simple hardcoded fallback just in case the LLM formatting cracks
                finalResponse.reply = rawContent;
                finalResponse.trivia = {
                    question: `Are you ready to surpass your limits with ${selectedChar}?`,
                    options: ["Yes!", "Absolutely!", "Always!", "No"],
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

        return res.status(200).json(finalResponse);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Critical internal server handler failure.' });
    }
}
