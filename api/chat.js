const topicsPool = [
    "combat styles", "hidden abilities", "iconic battles", "allies and enemies", "lore and backstories", "signature moves"
];

// --- Helper Functions ---

async function checkUserEligibility(cleanUrl, supabaseKey, cleanUsername) {
    const userCheck = await fetch(`${cleanUrl}/rest/v1/user_profiles?username=eq.${encodeURIComponent(cleanUsername)}`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    return await userCheck.json();
}

async function createUser(cleanUrl, supabaseKey, cleanUsername, randomTargetTurn) {
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
}

async function updateUser(cleanUrl, supabaseKey, cleanUsername, data) {
    await fetch(`${cleanUrl}/rest/v1/user_profiles?username=eq.${encodeURIComponent(cleanUsername)}`, {
        method: 'PATCH',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
}

async function callGroq(groqApiKey, messages, options = {}) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqApiKey.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: messages,
            ...options
        })
    });
    if (!response.ok) throw new Error('Groq API error');
    return await response.json();
}

async function incrementPower(cleanUrl, supabaseKey, cleanUsername, amount) {
    try {
        await fetch(`${cleanUrl}/rest/v1/rpc/increment_power`, {
            method: 'POST',
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ p_username: cleanUsername, p_amount: amount })
        });
    } catch (dbErr) {
        console.error("Points update failed:", dbErr);
    }
}

// --- Main Handler ---

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { messages, username, character, generateTrivia } = req.body;
        const selectedChar = character || "Goku"; 
        
        if (!username || username.trim() === '' || username.trim() === 'Anonymous User') {
            return res.status(400).json({ error: 'Please log in with a valid Username!' });
        }
        
        const cleanUsername = String(username).trim().toLowerCase();

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        const groqApiKey = process.env.GROQ_API_KEY;

        if (!groqApiKey || !supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'Backend configuration missing!' });
        }

        const cleanUrl = supabaseUrl.replace(/\/$/, '');
        let userAllowed = true;
        let includeTriviaThisTurn = false;

        // DB Logic
        try {
            const userData = await checkUserEligibility(cleanUrl, supabaseKey, cleanUsername);
            const randomTargetTurn = Math.floor(Math.random() * 5) + 3; 

            if (!Array.isArray(userData) || userData.length === 0) {
                await createUser(cleanUrl, supabaseKey, cleanUsername, randomTargetTurn);
            } else {
                const currentCount = parseInt(userData[0].messages_sent_today) || 0;
                
                if (currentCount >= 50) {
                    userAllowed = false;
                } else {
                    const nextCount = currentCount + 1;
                    const targetTurn = parseInt(userData[0].trivia_target_turn) || randomTargetTurn;
                    const hasReceived = String(userData[0].has_received_trivia) === 'true';
                    let nextTriviaState = hasReceived;

                    if (!hasReceived && (nextCount === targetTurn || nextCount >= 10)) {
                        includeTriviaThisTurn = true;
                        nextTriviaState = true;
                    }

                    await updateUser(cleanUrl, supabaseKey, cleanUsername, { 
                        messages_sent_today: nextCount, 
                        has_received_trivia: nextTriviaState,
                        last_message_at: new Date() 
                    });
                }
            }
        } catch (err) {
            console.error("Supabase engine error bypassed:", err);
        }

        if (!userAllowed) {
            return res.status(403).json({ error: "Training limits reached!" });
        }

        // Generate Chat
        const chatData = await callGroq(groqApiKey, messages, { temperature: 0.7, max_tokens: 150 });
        const finalResponse = { reply: chatData.choices[0].message.content.trim() };

        // Generate Trivia
        if (includeTriviaThisTurn || generateTrivia === true || generateTrivia === "true") {
            try {
                const randomTopic = topicsPool[Math.floor(Math.random() * topicsPool.length)];
                const triviaData = await callGroq(groqApiKey, [{
                    role: "system",
                    content: `You are a trivia generator bot. Create a highly accurate, random multiple-choice trivia question about ${selectedChar} based on: ${randomTopic}.
                            Reply ONLY with JSON: {"question": "...", "options": ["...", "...", "...", "..."], "correct": 0}`
                }], { temperature: 0.9, response_format: { type: "json_object" } });

                finalResponse.trivia = JSON.parse(triviaData.choices[0].message.content.trim());
            } catch (triviaErr) {
                finalResponse.trivia = {
                    question: `Are you ready to unlock maximum power with ${selectedChar}?`,
                    options: ["Let's do it!", "Absolutely!", "Not sure", "No"],
                    correct: 0
                };
            }
        }

        await incrementPower(cleanUrl, supabaseKey, cleanUsername, 10);
        return res.status(200).json(finalResponse);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server failure.' });
    }
}
