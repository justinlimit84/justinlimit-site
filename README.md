# JustinLimit AI - High-Speed Anime Chat Hub

A production-ready, highly scalable, ultra-fast AI chat platform that lets concurrent users interact in real time with dynamic anime character profiles such as Goku, Naruto, Sasuke, Sakura, and Sarada.

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
```
[ User Browser ] ➔ [ GitHub Pages ] ➔ [ Public API ] ➔ [ Rate-Limited Proxy ]
```

### New Production Infrastructure (Scalable & Measured)
```
                [ User Browser ]
                       ↓
        [ Custom Domain: justinlimit.com ]
                       ↓
            [ Vercel Global Edge ]
                       ↓
         ┌─────────────┬─────────────┐
         ↓             ↓             ↓
   [ Groq API ]  [ Supabase DB ]  [ Token Telemetry ]
```

---

## 📁 Repository Structure

```
├── index.html          # Frontend single-page application (UI, Auth & State)
├── api/
│   └── chat.js         # Serverless Node.js backend route (Groq controller & DB pipeline)
└── README.md           # Project documentation
```

---

## ⚙️ Backend Logic & Telemetry Pipeline (api/chat.js)

- **Method Enforcement**: Standardized to accept POST requests while natively intercepting and resolving browser cross-origin preflight OPTIONS requests.
- **Environment Isolation**: Securely reads API credentials on the serverless engine; keys are never exposed to the client side.
- **CORS Configuration**: Fully managed headers allowing secure cross-origin asset resource sharing across custom domains.
- **Synchronous Token Logging**: Captures LLM choice tokens (prompt_tokens, completion_tokens, total_tokens) paired against the logged-in frontend username.
- **Serverless Lifecycle Management**: Utilizes synchronous, awaited network calls to the database layer to ensure the serverless runtime container does not freeze or terminate mid-transaction.

---

## 💾 Database Layer Setup (Supabase)

The backend interacts directly with a Supabase PostgreSQL instance using a highly optimized Stored Procedure (RPC) to insert token log rows.

### 1. Database Table Schema

Create a table named `token_logs` with the following column structure:

| Column Name | Data Type | Attributes |
|---|---|---|
| id | bigint | Primary Key, Generated Always As Identity |
| created_at | timestamp with time zone | Default: `now()` |
| user_id | text | Nullable |
| prompt_tokens | integer | Nullable |
| completion_tokens | integer | Nullable |
| total_tokens | integer | Nullable |

### 2. Stored Procedure (RPC Function)

Execute the following SQL block in your Supabase SQL Editor to handle incoming serverless traffic payloads:

```sql
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
```

---

## 🔑 Environment Variables

To run this application, you must configure the following keys inside your deployment platform (e.g., Vercel Project Settings) or your local `.env` file:

| Variable Name | Description | Required |
|---|---|---|
| `GROQ_API_KEY` | Your Groq API key for LLM inference | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (without trailing slashes) | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key for database access | ✅ Yes |

⚠️ **Note**: Never append trailing slashes or subpaths (like `/rest/v1/`) to your `NEXT_PUBLIC_SUPABASE_URL` environment variable.

---

## 📦 Setup & Local Development

### 1. Clone the repository

```bash
git clone https://github.com/justinlimit84/justinlimit-site.git
cd justinlimit-site
```

### 2. Set up local variables

Create a local `.env.local` file matching the key patterns in the Environment Variables section above.

### 3. Execute local serverless server

Run Vercel CLI locally to mount the frontend static routing combined with functional `/api/chat` serverless modules:

```bash
vercel dev
```

---

## 🔁 Deployment

### Vercel Hosting
1. Link this GitHub repository directly to your Vercel project dashboard.
2. Add environment variables in Vercel Project Settings (see Environment Variables section).
3. Production commits to your `main` branch will automatically trigger builds.

### DNS Configuration
Configure your domain apex host parameters (e.g., within GoDaddy):
- Set the root `@` A Record to Vercel's Anycast IP: `76.76.21.21`
- Map your `www` alias as a CNAME record pointing to your Vercel deployment domain.

---

## 📊 Telemetry Analysis Queries

To extract daily runtime operational consumption metrics, open your Supabase SQL Editor and run the following queries:

### Day-to-Day Total Volumetric Metrics

```sql
SELECT 
    COUNT(DISTINCT user_id) AS total_active_users_today,
    SUM(total_tokens) AS grand_total_tokens_consumed_today
FROM token_logs
WHERE created_at >= CURRENT_DATE;
```

### High-Consumer Leadership Rankings

```sql
SELECT 
    user_id,
    COUNT(id) AS total_messages_sent,
    SUM(total_tokens) AS total_tokens_used
FROM token_logs
GROUP BY user_id
ORDER BY total_tokens_used DESC;
```

---

## 🤝 Contributing

Contributions are welcome! To contribute:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License. See the LICENSE file for details.

---

## 📧 Contact

**Author**: JustinLimit  
**GitHub**: [github.com/justinlimit84](https://github.com/justinlimit84)  
**Email**: [beyond@justinlimit.com](mailto:beyond@justinlimit.com)

---

## 🎨 Characters

Interact with AI-powered versions of your favorite anime characters:
- **Goku** - The Legendary Saiyan
- **Naruto Uzumaki** - The 7th Hokage
- **Sasuke Uchiha** - The Supporting Kage
- **Sakura Haruno** - Head Medical Ninja
- **Sarada Uchiha** - Next Gen Uchiha
