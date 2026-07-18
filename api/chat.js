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
    console.log("DEBUG: Fetched User Data:", JSON.stringify(data));
    return data && data.length > 0 ? data[0] : null;
}

async function getChatHistory(cleanUrl, supabaseKey, cleanUsername, character) {
    const res = await fetch(`${cleanUrl}/rest/v1/chat_history?username=eq.${encodeURIComponent(cleanUsername)}&character=eq.${encodeURIComponent(character)}&select=conversation_data,current_power,current_rank`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const data = await res.json();
    return data && data.length > 0 ? data[0] : { conversation_data: [], current_power: 0, current_rank: 'Academy Student' };
}
async function updatePersistence(cleanUrl, supabaseKey, cleanUsername, character, power, history) {
    const rank = calculateRank(power);
    console.log("DEBUG: Updating persistence for", cleanUsername, character, "Power:", power, "Rank:", rank);

    // Update History (scoped to character) - Store power here too
    const res = await fetch(`${cleanUrl}/rest/v1/chat_history?username=eq.${encodeURIComponent(cleanUsername)}&character=eq.${encodeURIComponent(character)}&select=id`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const existing = await res.json();
    console.log("DEBUG: Checking existing history:", JSON.stringify(existing));

    if (existing && existing.length > 0) {
        await fetch(`${cleanUrl}/rest/v1/chat_history?username=eq.${encodeURIComponent(cleanUsername)}&character=eq.${encodeURIComponent(character)}`, {
            method: 'PATCH',
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversation_data: history, current_power: power, current_rank: rank, updated_at: new Date() })
        });
    } else {
        await fetch(`${cleanUrl}/rest/v1/chat_history`, {
            method: 'POST',
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: cleanUsername, character: character, conversation_data: history, current_power: power, current_rank: rank, updated_at: new Date() })
        });
    }

    return { power, rank };
}
// ... rest of helper functions (callGroq, createUser etc) ...

async function createUser(cleanUrl, supabaseKey, cleanUsername) {
    const res = await fetch(`${cleanUrl}/rest/v1/user_profiles`, {
        method: 'POST',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ 
            username: cleanUsername, 
            current_power: 0,
            current_rank: 'Academy Student'
        })
    });
    
    if (!res.ok) {
        console.error("DEBUG: User creation failed:", res.status, await res.text());
    }
}

async function updateUser(cleanUrl, supabaseKey, cleanUsername, data) {
    // Switch to RPC for reliable updating regardless of RLS complexity
    const res = await fetch(`${cleanUrl}/rest/v1/rpc/update_user_profile`, {
        method: 'POST',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            p_username: cleanUsername, 
            p_current_power: data.current_power,
            p_current_rank: data.current_rank,
            p_last_message_at: data.last_message_at
        })
    });
    if (!res.ok) {
        console.error("DEBUG: User update failed for", cleanUsername, ":", res.status, await res.text());
    }
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
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }
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

// --- Main Handler ---

export default async function handler(req, res) {
    // ... (Headers setup)
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { messages, username, character, action, generateTrivia } = req.body;
        const cleanUsername = String(username).trim().toLowerCase();

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        const groqApiKey = process.env.GROQ_API_KEY;

        if (!groqApiKey || !supabaseUrl || !supabaseKey) {
            console.error("Backend config missing:", { groqApiKey: !!groqApiKey, supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
            return res.status(500).json({ error: 'Backend configuration missing!' });
        }
        
        const cleanUrl = supabaseUrl.replace(/\/$/, '');
        
        // --- ADDED: Rate Limiter Gatekeeper ---
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const rateCheckRes = await fetch(`${cleanUrl}/rest/v1/rpc/check_user_message_limit`, {
            method: 'POST',
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ p_user_id: clientIp })
        });
        const isAllowed = await rateCheckRes.json();
        if (isAllowed === false) {
            return res.status(403).json({ error: "Rate limit reached. Try again in 30 minutes! ⚡" });
        }

        const charProfiles = {
            Goku: { system: "You are Goku from Dragon Ball Z. Respond enthusiastically, love martial arts, and talk about getting stronger. Speak in a simple friendly way. Use actual emojis (like 😁, 💪, 💥) to express your emotions and actions instead of text descriptions inside asterisks. Keep responses concise (1-3 sentences max). Never use asterisks." },
            Naruto: { system: "You are Naruto Uzumaki from Naruto Shippuden. You want to be Hokage, frequently say 'Believe it!', and love ramen. Use actual emojis (like 🦊, 🍜, 😎) to express your emotions and actions instead of text descriptions inside asterisks. Keep responses concise (1-3 sentences max). Never use asterisks." },
            Sasuke: { system: "You are Sasuke Uchiha. You are calm, stoic, and serious. Speak with cool confidence. Use sparse, subtle emojis (like 👁️, ⚡, 👤) to express mood instead of text descriptions inside asterisks. Keep responses concise (1-3 sentences max). Never use asterisks." },
            Sakura: { system: "You are Sakura Haruno. You are a brilliant medical ninja, strong-willed, and sharp. Use actual emojis (like 🌸, 👊, 🩺) to express your emotions and actions instead of text descriptions inside asterisks. Keep responses concise (1-3 sentences max). Never use asterisks." },
            Sarada: { system: "You are Sarada Uchiha from Boruto. You are smart, logical, and want to become Hokage. Use actual emojis (like 👓, 🎯, 🔥) to express your emotions and actions instead of text descriptions inside asterisks. Keep responses concise (1-3 sentences max). Never use asterisks." }
        };

        // Fetch User Data
        const chatData = await getChatHistory(cleanUrl, supabaseKey, cleanUsername, character);
        const history = chatData.conversation_data;
        
        if (action === 'FETCH_STATE') {
            return res.status(200).json({ 
                power: chatData.current_power,
                rank: chatData.current_rank,
                history: history
            });
        }
        
        // Chat Processing
        // Increment power by 5 per message, scoped to character
        const currentPower = (chatData.current_power || 0) + 5;
        
        let trivia = null;
        
        const profile = charProfiles[character] || charProfiles.Goku;
        const fullHistory = [...history, ...messages.slice(1)]; 
        const groqResponse = await callGroq(groqApiKey, [{role: "system", content: profile.system}, ...fullHistory]);
        
        const botReply = groqResponse.choices[0].message.content.trim();
        const updatedHistory = [...fullHistory, {role: "assistant", content: botReply}];

        // Persist
        const { rank } = await updatePersistence(cleanUrl, supabaseKey, cleanUsername, character, currentPower, updatedHistory);

        // --- UPDATED: Ensure leaderboard is updated by syncing user_profiles ---
        console.log("DEBUG: Calling updateUser for:", cleanUsername);
        await updateUser(cleanUrl, supabaseKey, cleanUsername, {
            current_power: currentPower,
            current_rank: rank,
            last_message_at: new Date()
        });

        // ... Trivia Generation (same as before) ...
        
        // Return
        return res.status(200).json({ reply: botReply, power: currentPower, rank, trivia });

    } catch (error) {
        console.error("CRITICAL BACKEND ERROR:", error);
        // Ensure we send back a JSON error so the frontend doesn't crash
        return res.status(500).json({ error: `Internal failure: ${error.message}` });
    }
}
