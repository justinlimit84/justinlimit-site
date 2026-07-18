const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const cleanUrl = supabaseUrl.replace(/\/$/, '');
        const response = await fetch(`${cleanUrl}/rest/v1/user_profiles?select=username,current_power&order=current_power.desc&limit=10`, {
            headers: { 
                'apikey': supabaseKey, 
                'Authorization': `Bearer ${supabaseKey}`,
                'Cache-Control': 'no-cache'
            }
        });
        const data = await response.json();
        const validData = data.filter(u => u.username && u.username !== 'null' && u.username !== 'undefined' && u.current_power > 0);
        
        // Prevent browser caching of this response
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        return res.status(200).json(validData);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
}
