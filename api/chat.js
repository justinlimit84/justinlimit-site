const topicsPool = [
    "combat styles", "hidden abilities", "iconic battles", "allies and enemies", "lore and backstories", "signature moves"
];

const ranks = [
    { name: "Academy Student", minPower: 0 },
    { name: "Genin", minPower: 50 },
    { name: "Chunin", minPower: 150 },
    { name: "Jonin", minPower: 300 },
    { name: "Kage/Master", minPower: 500 }
];

function calculateRank(power) {
    let currentRank = ranks[0].name;
    for (const rank of ranks) {
        if (power >= rank.minPower) currentRank = rank.name;
    }
    return currentRank;
}

// --- Helper Functions ---

async function fetchUserData(cleanUrl, supabaseKey, cleanUsername) {
    const res = await fetch(`${cleanUrl}/rest/v1/user_profiles?username=eq.${encodeURIComponent(cleanUsername)}`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const data = await res.json();
    return data && data.length > 0 ? data[0] : null;
}

async function getChatHistory(cleanUrl, supabaseKey, cleanUsername) {
    const res = await fetch(`${cleanUrl}/rest/v1/chat_history?username=eq.${encodeURIComponent(cleanUsername)}`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const data = await res.json();
    return data && data.length > 0 ? data[0].conversation_data : [];
}

async function updatePersistence(cleanUrl, supabaseKey, cleanUsername, power, history) {
    const rank = calculateRank(power);

    // Update Profile
    await fetch(`${cleanUrl}/rest/v1/user_profiles?username=eq.${encodeURIComponent(cleanUsername)}`, {
        method: 'PATCH',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_power: power, current_rank: rank })
    });

    // Update History
    await fetch(`${cleanUrl}/rest/v1/chat_history?username=eq.${encodeURIComponent(cleanUsername)}`, {
        method: 'UPSERT',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, conversation_data: history })
    });

    return { power, rank };
}
// ... rest of helper functions (callGroq, createUser etc) ...

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
        const { messages, username, character } = req.body;
        const cleanUsername = String(username).trim().toLowerCase();

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        const groqApiKey = process.env.GROQ_API_KEY;

        if (!groqApiKey || !supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'Backend configuration missing!' });
        }

        const cleanUrl = supabaseUrl.replace(/\/$/, '');
        const charProfiles = { // Minimal requirement to fix crash
            Goku: { system: "..." }, Naruto: { system: "..." }, Sasuke: { system: "..." },
            Sakura: { system: "..." }, Sarada: { system: "..." }
        };
        
        // 1. Fetch State
        const userData = await fetchUserData(cleanUrl, supabaseKey, cleanUsername);
        const history = await getChatHistory(cleanUrl, supabaseKey, cleanUsername);
        
        const currentPower = userData ? (userData.current_power || 0) + 10 : 10;
        
        // 2. Combine and call Groq
        const fullHistory = [...history, ...messages.slice(1)]; 
        const chatData = await callGroq(groqApiKey, [{role: "system", content: charProfiles[character].system}, ...fullHistory]);
        
        const botReply = chatData.choices[0].message.content.trim();
        const updatedHistory = [...fullHistory, {role: "assistant", content: botReply}];

        // 3. Persist
        const { rank } = await updatePersistence(cleanUrl, supabaseKey, cleanUsername, currentPower, updatedHistory);

        // 4. Return
        return res.status(200).json({ reply: botReply, power: currentPower, rank });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal failure.' });
    }
}
