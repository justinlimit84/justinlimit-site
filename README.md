# JustinLimit AI - High-Speed Anime Chat Hub

A production-ready, highly scalable, ultra-fast AI chat platform that lets concurrent users interact in real time with dynamic anime character profiles (for example: Goku, Naruto, Sasuke, Sakura, Sarada).

The platform focuses on performance, security, high concurrency, and real-time usage telemetry using a serverless architecture (Vercel), Groq inference, and Supabase for persistence.

---

## 🚀 Key Features

- **High Speed & Low Latency**: Uses Groq's `llama-3.1-8b-instant` for sub-second responses.
- **Massive Concurrency**: Vercel Edge Serverless Functions for high throughput and global availability.
- **Robust Security**: Secrets and credentials are only read server-side; the frontend never exposes API tokens.
- **Smart IP Gatekeeper**: Client public IPs are resolved server-side via Vercel headers to reduce spoofing/token-draining attacks.
- **Rolling Rate Limiter**: Strict rolling 30-minute window restriction (default: max 10 messages per IP) enforced by the DB gatekeeper.
- **Mobile-Responsive UI**: Cyberpunk dark theme UI with character selection and responsive layout.

---

## 🛠️ Architecture

Old (bottlenecked) flow:

[ User Browser ] ➔ [ GitHub Pages ] ➔ [ Public API ] ➔ [ Rate-Limited Proxy ]

New (production) flow:

[ User Browser ]
  ↓
[ Custom Domain: justinlimit.com ]
  ↓
[ Vercel Global Edge ]
  ↓
┌─────────────┬─────────────┬─────────────┐
│ Gatekeeper  │ Groq API    │ Supabase DB │
└─────────────┴─────────────┴─────────────┘

- Gatekeeper: validates client eligibility, enforces rate limits, records telemetry.
- Groq API: inference endpoint for model responses.
- Supabase: stores token logs and enforces message limits.

---

## 📁 Repository Structure

Top-level files and folders:

- `index.html` — Frontend single-page application (UI, auth & state)
- `api/` — Serverless backend routes (Groq controller & DB pipeline)
  - `api/chat.js` — Main chat API route
- `README.md` — This file

---

## ⚙️ Backend (api/chat.js) — Overview

Key responsibilities implemented in the serverless chat route:

- Accepts POST requests and handles OPTIONS preflight.
- Reads secrets from environment variables on the server only.
- Configures CORS and secure headers for cross-origin requests.
- Resolves client IP from `req.headers['x-forwarded-for']` (or other Vercel headers) server-side.
- Calls the Supabase gatekeeper RPC before forwarding requests to Groq.
- Logs token usage to the database after inference responses.

---

## 💾 Database Layer (Supabase/Postgres)

The project stores usage telemetry and enforces the rolling rate limit using a `token_logs` table and two stored procedures.

1) Create the telemetry table:

```sql
CREATE TABLE IF NOT EXISTS public.token_logs (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id text NOT NULL,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer
);
```

2) Gatekeeper: `check_user_message_limit`

This function returns `true` when the user is under the limit and `false` when blocked.

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
    v_clean_ip := TRIM(p_user_id);

    SELECT COUNT(*)
    INTO v_message_count
    FROM public.token_logs
    WHERE TRIM(user_id) = v_clean_ip
      AND created_at >= NOW() - INTERVAL '30 minutes';

    IF v_message_count >= 10 THEN
        RETURN FALSE; -- Block
    ELSE
        RETURN TRUE;  -- Allow
    END IF;
END;
$$;
```

3) Token logging function: `log_tokens`

```sql
CREATE OR REPLACE FUNCTION public.log_tokens(
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
    ) VALUES (
        p_user_id,
        p_prompt_tokens,
        p_completion_tokens,
        p_total_tokens,
        NOW()
    );
END;
$$;
```

Notes:
- Adjust the 30-minute window or limit count as needed for your deployment.
- Consider indexing `user_id` and `created_at` for better query performance:

```sql
CREATE INDEX IF NOT EXISTS idx_token_logs_user_time ON public.token_logs (user_id, created_at);
```

---

## 🔑 Required Environment Variables

Set the following variables in your deployment platform (Vercel Project Settings) or a local `.env.local` for development:

- VERCEL (deployment)
  - VERCEL_TOKEN — (optional) CLI token for deployment automation
- GROQ (inference)
  - GROQ_API_KEY — API key used by the serverless function to call Groq
  - GROQ_MODEL — e.g. `llama-3.1-8b-instant`
- SUPABASE
  - SUPABASE_URL — Supabase project URL
  - SUPABASE_SERVICE_ROLE_KEY — Service role key with RPC/insert privileges

Do not expose the above keys to the browser or commit them to source control.

---

## 🧪 Local Development

1. Clone the repo

```bash
git clone https://github.com/justinlimit84/justinlimit-site.git
cd justinlimit-site
```

2. Create a `.env.local` with the environment variables listed above.

3. Run the Vercel dev server locally (requires Vercel CLI):

```bash
npm i -g vercel
vercel dev
```

4. Open `http://localhost:3000` (or the Vercel dev URL shown) and test the chat UI.

---

## 🔁 Deployment

1. Connect the repository to Vercel and add the environment variables in the Vercel Project Settings.
2. Deploy to production via the Vercel dashboard or `vercel --prod` from the CLI.

---

## 📊 Example Reporting Queries

Daily totals and top IPs (run from SQL editor):

```sql
-- Daily totals
SELECT
    COUNT(DISTINCT user_id) AS total_active_ips_today,
    SUM(total_tokens) AS grand_total_tokens_consumed_today
FROM token_logs
WHERE created_at >= CURRENT_DATE;

-- High-consumer IP rankings
SELECT
    user_id AS client_ip,
    COUNT(id) AS total_messages_sent,
    SUM(total_tokens) AS total_tokens_used
FROM token_logs
GROUP BY user_id
ORDER BY total_tokens_used DESC
LIMIT 50;
```

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/my-improvement`.
3. Commit changes: `git commit -m "feat: description"`.
4. Push and open a pull request describing the change.

## 📧 Contact

- Author: JustinLimit
- GitHub: github.com/justinlimit84

## Email: beyond@justinlimit.com
---

If you'd like further edits to the README (add screenshots, code samples, or more deployment tips), tell me what you'd like included and I'll update it.
