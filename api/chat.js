// A lightweight internal helper array to fall back on if you want completely random ideas without breaking history
const topicsPool = [
    "combat styles", "hidden abilities", "iconic battles", "allies and enemies", "lore and backstories", "signature moves"
];

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

        // 2. Environment Variables
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

        // 3. DATABASE CHECK & STATE FORCING
        try {
            const userCheck = await fetch(`${cleanUrl}/rest/v1/user_profiles?username=eq.${encodeURIComponent(cleanUsername)}`, {
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
            });
            const userData = await userCheck.json();

            // Set a random turn target out of the gate (Turns 3 through 7)
            const randomTargetTurn = Math.floor(Math.random() * 5) + 3; 

            if (!Array.isArray(userData) || userData.length === 0) {
                // New User Creation
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
                const currentCount = parseInt(userData[0].messages_sent_today) || 0;
                
                if (currentCount >= 50) {
                    userAllowed = false;
                } else {
                    const nextCount = currentCount + 1;
                    const targetTurn = parseInt(userData[0].trivia_target_turn) || randomTargetTurn;
                    
                    // Explicitly cast database values to check against structural truth
                    const hasReceived = String(userData[0].has_received_trivia) === 'true';
                    
                    let nextTriviaState = hasReceived;

                    // STRICT RULE TRIGGER CHECK
                    if (!hasReceived && (nextCount === targetTurn || nextCount >= 10)) {
                        includeTriviaThisTurn = true;
                        nextTriviaState = true; // Flips permanently right here
                    }

                    // Write updates immediately back down to database
                    await fetch(`${cleanUrl}/rest/v1/user_profiles?username=eq.${encodeURIComponent(cleanUsername)}`, {
                        method: 'PATCH',
                        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            messages_sent_today: nextCount, 
                            has_received_trivia: nextTriviaState,
                            last_message_at: new Date() 
                        })
                    });
                }
            }
        } catch (err) {
            console.error("Supabase engine error bypassed:", err);
        }

        if (!userAllowed) {
            return res.status(403).json({ error: "Training limits reached for today! Come back tomorrow to recharge your energy! ⚡" });
        }

        // 4. STEP 1: GENERATE STANDARD CHARACTER CHAT CHANNELS ONLY
        // We do NOT modify the conversation history payload sent to Groq. Keep it pure text.
        const chatResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${groqApiKey.trim()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: messages,
                temperature: 0.7,
                max_tokens: 150
            })
        });

        if (!chatResponse.ok) return res.status(500).json({ error: 'Groq chat engine connection drop.' });
        const chatData = await chatResponse.json();
        const cleanChatReply = chatData.choices[0].message.content.trim();

        // 5. PREPARE RESPONSES
        const finalResponse = { reply: cleanChatReply };

        // 6. STEP 2: INDEPENDENT ASYNCHRONOUS TRIVIA BLOCK
        // If state tracking triggers, we spawn an isolated separate call to generate raw trivia JSON
        if (includeTriviaThisTurn) {
            try {
                const randomTopic = topicsPool[Math.floor(Math.random() * topicsPool.length)];
                
                const triviaGeneration = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${groqApiKey.trim()}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'llama-3.1-8b-instant',
                        messages: [{
                            role: "system",
                            content: `You are a trivia generator bot. Create a highly accurate multiple-choice trivia question about the character ${selectedChar} from their respective anime universe based on the topic: ${randomTopic}.
                            You must reply ONLY with a valid JSON object matching this schema structure:
                            {
                                "question": "Question text here?",
                                "options": ["Option 0", "Option 1", "Option 2", "Option 3"],
                                "correct": 0
                            }
                            Note: "correct" must be the index number (0, 1, 2, or 3) of the right option. Do not add any text before or after the JSON.`
                        }],
                        temperature: 0.85,
                        response_format: { type: "json_object" }
                    })
                });

                if (triviaGeneration.ok) {
                    const triviaData = await triviaGeneration.json();
                    const parsedTrivia = JSON.parse(triviaData.choices[0].message.content.trim());
                    if (parsedTrivia.question && Array.isArray(parsedTrivia.options)) {
                        finalResponse.trivia = parsedTrivia;
                    }
                }
            } catch (triviaErr) {
                console.error("Trivia generation issue encountered, inserting static backup object:", triviaErr);
                // Hardcoded absolute backup so user experience doesn't break
                finalResponse.trivia = {
                    question: `Are you ready to unlock maximum power with ${selectedChar}?`,
                    options: ["Let's do it!", "Absolutely!", "Not sure", "No"],
                    correct: 0
                };
            }
        }

        // 7. REWARD SYSTEM POWER POINTS
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
