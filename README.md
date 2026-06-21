# JustinLimit AI - High-Speed Anime Chat Hub

A production-ready, highly scalable, ultra-fast AI chat platform that lets concurrent users interact in real time with dynamic anime character profiles such as Goku, Naruto, Sasuke, Sakura, Sara, and more.

The platform is optimized for performance, security, high concurrency, and real-time usage analytics by utilizing a serverless architecture powered by Vercel, Groq, and Supabase.

---

## 🚀 Key Features

- **High Speed & Low Latency**: Uses Groq's high-performance hardware running the `llama-3.1-8b-instant` model to achieve near-instantaneous (sub-second) response times.
- **Massive Concurrency**: Built on Vercel Edge Serverless Functions to handle thousands of concurrent visits without queuing users.
- **Robust Security**: Frontend never exposes secret API tokens; credential validation, request tracking, and database logging happen entirely within a stateless backend API route.
- **Real-Time Token Tracking**: Passively tracks prompt, completion, and total token usage per user session, streaming telemetry metrics straight to an external database.
- **Mobile-Responsive UI**: Custom cyberpunk dark layout with character selection modules that scale fluidly across all viewports.

---

## 🛠️ Architecture

### Old Infrastructure (Bottlenecked)
```text
[ User Browser ] ➔ [ GitHub Pages (Static Hosting) ] ➔ [ Public API ] ➔ [ Rate-Limited Proxy ]
New Production Infrastructure (Scalable & Measured)
[ User Browser ] ➔ [ Custom Domain: justinlimit.com ] ➔ [ Vercel Global Edge ]
                                                                │
                                                    ┌───────────┴───────────┐
                                                    ▼                       ▼
                                            [ Groq AI API ]        [ Supabase Database ]
                                        (llama-3.1-8b-instant)      (RPC Token Telemetry)

Repository Structure

├── index.html          # Frontend single-page application (UI, Auth & State)
├── api/
│   └── chat.js         # Serverless Node.js backend route (Groq controller & DB pipeline)
└── README.md           # Project documentation

Backend Logic & Telemetry Pipeline (api/chat.js)
Method Enforcement: Standardized to accept POST requests while natively intercepting and resolving browser cross-origin preflight OPTIONS requests.

Environment Isolation: Securely reads API credentials on the serverless engine; keys are never exposed to the client side.

CORS Configuration: Fully managed headers allowing secure cross-origin asset resource sharing across custom domains.

Synchronous Token Logging: Captures LLM choice tokens (prompt_tokens, completion_tokens, total_tokens) paired against the logged-in frontend username.

Serverless Lifecycle Management: Utilizes synchronous, awaited network calls to the database layer to ensure the serverless runtime container does not freeze or terminate mid-transaction.

💾 Database Layer Setup (Supabase)
The backend interacts directly with a Supabase PostgreSQL instance using a highly optimized Stored Procedure (RPC) to insert token log rows.

1. Database Table Schema
Create a table named token_logs with the following column structure:


Column NameData TypeAttributesidbigintPrimary Key, Generated Always As Identitycreated_attimestamp with time zoneDefault: now()user_idtextNullableprompt_tokensintegerNullablecompletion_tokensintegerNullabletotal_tokensintegerNullable

2. Stored Procedure (RPC Function)
Execute the following SQL block in your Supabase SQL Editor to handle incoming serverless traffic payloads:

DROP FUNCTION IF EXISTS log_tokens;

CREATE OR REPLACE FUNCTION log_tokens(
    p_user_id TEXT,
    p_prompt_tokens INT,
    p_completion_tokens INT,
    p_total_tokens INT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO token_logs (user_id, prompt_tokens, completion_tokens, total_tokens)
    VALUES (p_user_id, p_prompt_tokens, p_completion_tokens, p_total_tokens);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

🔑 Environment VariablesTo run this application, you must configure the following keys inside your deployment platform (e.g., Vercel Project Settings) or your local .env profile:Variable NameDescriptionExample / FormatGROQ_API_KEYSecret key used to authorize Llama inferencing.gsk_...NEXT_PUBLIC_SUPABASE_URLThe clean base domain URL of your Supabase project.https://yourprojectid.supabase.coSUPABASE_SERVICE_ROLE_KEYSecret elevated database bypass key used to execute the logging RPC.sb_secret_...

⚠️ Note: Never append trailing slashes or subpaths (like /rest/v1/) to your NEXT_PUBLIC_SUPABASE_URL environment variable.

📦 Setup & Local Development
Clone the repository:

git clone [https://github.com/justinlimit84/justinlimit-site.git](https://github.com/justinlimit84/justinlimit-site.git)
cd justinlimit-site

Set up local variables: Create a local environment system configurations manager matching the key patterns in the Environment Variables section.

Execute local serverless server: Run Vercel CLI locally to mount the frontend static routing combined with functional /api/chat serverless modules:

vercel dev

🔁 Deployment
Vercel Hosting: Link this GitHub repository directly to your Vercel project dashboard. Production commits to your main branch will automatically trigger builds.

DNS Configuration: Configure your domain apex host parameters (e.g., within GoDaddy) by setting the root @ A Record to Vercel's Anycast IP (76.76.21.21) and mapping your www alias as a CNAME record pointing directly back to Vercel's global router infrastructure.

📊 Telemetry Analysis Queries
To extract daily runtime operational consumption metrics, open your Supabase SQL Editor and run the following analytical query blocks:

Day-to-Day Total Volumetric Metrics

SELECT 
    COUNT(DISTINCT user_id) AS total_active_users_today,
    SUM(total_tokens) AS grand_total_tokens_consumed_today
FROM token_logs
WHERE created_at >= CURRENT_DATE;

High-Consumer Leadership Rankings

SELECT 
    user_id,
    COUNT(id) AS total_messages_sent,
    SUM(total_tokens) AS total_tokens_used
FROM token_logs
GROUP BY user_id
ORDER BY total_tokens_used DESC;

Contributing
Contributions are welcome. Open an issue or submit a PR.

License
This project is licensed under the MIT License.

Contact
Author: JustinLimit (github.com/justinlimit84)
Email: beyond@justinlimit.com
