# JustinLimit AI - High-Speed Anime Chat Hub

A production-ready, highly scalable, ultra-fast AI chat platform that lets concurrent users interact in real time with dynamic anime character profiles such as Goku, Naruto, Sasuke, Sakura, and Sarada.

The platform is optimized for performance, security, high concurrency, and real-time usage analytics by utilizing a serverless architecture powered by Vercel, Groq, and Supabase.

---

## 🚀 Key Features

- **High Speed & Low Latency**: Uses Groq's high-performance hardware running the `llama-3.1-8b-instant` model to achieve near-instantaneous (sub-second) response times.
- **Massive Concurrency**: Built on Vercel Edge Serverless Functions to handle thousands of concurrent visits without queuing users.
- **Robust Security**: Frontend never exposes secret API tokens; credential validation, request tracking, and database logging happen entirely within a stateless backend API route.
- **Smart IP Gatekeeper**: Automatically extracts the user's real public IP address directly via Vercel infrastructure headers, protecting systems against token-draining exploits.
- **Rolling Rate Limiter**: Implements a strict rolling 30-minute window restriction (maximum 10 messages per IP) to preserve infrastructure resources elegantly.
- **Mobile-Responsive UI**: Custom cyberpunk dark layout with character selection modules that scale fluidly across all viewports.

---

## 🛠️ Architecture

### Old Infrastructure (Bottlenecked)
[ User Browser ] ➔ [ GitHub Pages ] ➔ [ Public API ] ➔ [ Rate-Limited Proxy ]
### New Production Infrastructure (Scalable & Measured)
            [ User Browser ]
                   ↓
    [ Custom Domain: justinlimit.com ]
                   ↓
        [ Vercel Global Edge ]
                   ↓
     ┌─────────────┼─────────────┐
     ↓             ↓             ↓
[ Gatekeeper ] [ Groq API ]  [ Supabase DB ](IP Rate-Limit)              (Token Telemetry)
---

## 📁 Repository Structure

├── index.html          # Frontend single-page application (UI, Auth & State)├── api/│   └── chat.js         # Serverless Node.js backend route (Groq controller & DB pipeline)└── README.md           # Project documentation
---

## ⚙️ Backend Logic & Telemetry Pipeline (api/chat.js)

- **Method Enforcement**: Standardized to accept POST requests while natively intercepting and resolving browser cross-origin preflight OPTIONS requests.
- **Environment Isolation**: Securely reads API credentials on the serverless engine; keys are never exposed to the client side.
- **CORS Configuration**: Fully managed headers allowing secure cross-origin asset resource sharing across custom domains.
- **Client IP Resolution**: Extracts proxy-forwarded Client IPs safely via `req.headers['x-forwarded-for']` to prevent client-side cookie/storage tampering.
- **Pre-Flight Limit Verification**: Evaluates individual client resource eligibility using an optimized database gatekeeper routine before allowing execution requests to Groq.

---

## 💾 Database Layer Setup (Supabase)

The backend interacts directly with a Supabase PostgreSQL instance using custom Stored Procedures (RPCs) to track user activity data.

### 1. Database Table Schema

Create a table named `token_logs` with the following column structure:

| Column Name | Data Type | Attributes |
|---|---|---|
| id | bigint | Primary Key, Generated Always As Identity |
| created_at | timestamp with time zone | Default: `now()` |
| user_id | text | Holds client IP or string indicators |
| prompt_tokens | integer | Nullable |
| completion_tokens | integer | Nullable |
| total_tokens | integer | Nullable |

### 2. Gatekeeper Verification Function (`check_user_message_limit`)

Execute the following SQL block in your Supabase SQL Editor to check and enforce the rolling 30-minute lockout rule:

```sql
CREATE OR REPLACE FUNCTION public.check_user_message_limit(p_user_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_message_count integer := 0;
    v_clean_ip text;
BEGIN
    -- Trim whitespace and handle empty inputs securely
    v_clean_ip := TRIM(p_user_id);

    -- Count exact matches within the rolling 30-minute window
    SELECT COUNT(*)
    INTO v_message_count
    FROM public.token_logs
    WHERE TRIM(user_id) = v_clean_ip
      AND created_at >= NOW() - INTERVAL '30 minutes';

    -- Strict Enforcement Rule
    IF v_message_count >= 10 THEN
        RETURN FALSE; -- Block access explicitly
    ELSE
        RETURN TRUE;  -- Under limit, allow message
    END IF;
END;
$$;
3. Token Logging Function (log_tokens)Execute the following SQL block to track incoming serverless traffic usage metadata accurately against the execution window timeline:SQLCREATE OR REPLACE FUNCTION public.log_tokens(
    p_user_id text,
    p_prompt_tokens integer,
    p_completion_tokens integer,
    p_total_tokens integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.token_logs (
        user_id,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        created_at
    )
    VALUES (
        p_user_id,
        p_prompt_tokens,
        p_completion_tokens,
        p_total_tokens,
        NOW()
    );
END;
$$;
🔑 Environment VariablesTo run this application, you must configure the following keys inside your deployment platform (e.g., Vercel Project Settings) or your local .env file:Variable NameDescriptionRequiredGROQ_API_KEYYour Groq API key for LLM inference✅ YesNEXT_PUBLIC_SUPABASE_URLYour Supabase project URL (without trailing slashes)✅ YesSUPABASE_SERVICE_ROLE_KEYYour Supabase service role key for database access✅ Yes⚠️ Note: Never append trailing slashes or subpaths (like /rest/v1/) to your NEXT_PUBLIC_SUPABASE_URL environment variable.📦 Setup & Local Development1. Clone the repositoryBashgit clone [https://github.com/justinlimit84/justinlimit-site.git](https://github.com/justinlimit84/justinlimit-site.git)
cd justinlimit-site
2. Set up local variablesCreate a local .env.local file matching the key patterns in the Environment Variables section above.3. Execute local serverless serverRun Vercel CLI locally to mount the frontend static routing combined with functional /api/chat serverless modules:Bashvercel dev
🔁 DeploymentVercel HostingLink this GitHub repository directly to your Vercel project dashboard.Add environment variables in Vercel Project Settings (see Environment Variables section).Production commits to your main branch will automatically trigger builds.DNS ConfigurationConfigure your domain apex host parameters (e.g., within GoDaddy):Set the root @ A Record to Vercel's Anycast IP: 76.76.21.21Map your www alias as a CNAME record pointing to your Vercel deployment domain.📊 Telemetry Analysis QueriesTo extract rolling operational consumption metrics, open your Supabase SQL Editor and run the following queries:Day-to-Day Total Volumetric MetricsSQLSELECT 
    COUNT(DISTINCT user_id) AS total_active_ips_today,
    SUM(total_tokens) AS grand_total_tokens_consumed_today
FROM token_logs
WHERE created_at >= CURRENT_DATE;
High-Consumer IP RankingsSQLSELECT 
    user_id AS client_ip,
    COUNT(id) AS total_messages_sent,
    SUM(total_tokens) AS total_tokens_used
FROM token_logs
GROUP BY user_id
ORDER BY total_tokens_used DESC;
🤝 ContributingContributions are welcome! To contribute:Fork the repositoryCreate a feature branch (git checkout -b feature/amazing-feature)Commit your changes (git commit -m 'Add amazing feature')Push to the branch (git push origin feature/amazing-feature)Open a Pull Request📜 LicenseThis project is licensed under the MIT License. See the LICENSE file for details.📧 ContactAuthor: JustinLimitGitHub: github.com/justinlimit84Email: beyond@justinlimit.com🎨 CharactersInteract with AI-powered versions of your favorite anime characters:Goku - The Legendary SaiyanNaruto Uzumaki - The 7th HokageSasuke Uchiha - The Supporting KageSakura Haruno - Head Medical NinjaSarada Uchiha - Next Gen Uchiha
