# JustinLimit AI - High-Speed Anime Chat Hub

A production-ready, highly scalable, AI chat platform enabling real-time interaction with dynamic anime character profiles (Goku, Naruto, Sasuke, Sakura, Sarada).

The platform focuses on high performance, robust security, and deep user engagement using a serverless architecture (Vercel), Groq AI inference, and Supabase for persistence.

---

## 🚀 Key Features

- **High Speed & Low Latency**: Utilizes Groq's `llama-3.1-8b-instant` for sub-second responses.
- **Robust Security & Rate Limiting**: Enforces a 25 message per 30-minute limit via IP-based Supabase gatekeepers.
- **Gamification & Persistence**: Tracks user power levels, ranks, and mastery counts, with rewards via dynamic trivia.
- **Visual Immersion**: Cyberpunk UI with character-specific themes and a high-intensity "Awakening Surge" animation at max power.
- **Mastery System**: Upon reaching 100% power, the system triggers an "Awakening" event, resetting power to 0 and incrementing mastery count.
- **Competitive Leaderboard**: Real-time trainer ranking based on power levels.

---

## 🛠️ Architecture

[ User Browser ]
  ↓
[ Custom Domain: justinlimit.com ]
  ↓
[ Vercel Global Edge ]
  ↓
┌─────────────┬─────────────┬─────────────┐
│ Gatekeeper  │ Groq API    │ Supabase DB │
└─────────────┴─────────────┴─────────────┘

---

## 💾 Database Layer

All database configurations are consolidated into `justinlimit-site/database-setup.sql`.

- **Tables**: `chat_history`, `user_profiles`, `user_blocks`.
- **Policies**: Row Level Security (RLS) is strictly enforced for public read/write access.
- **Functions (RPCs)**:
    - `check_user_message_limit`: Enforces rate limits (25 msgs / 30 mins).
    - `update_user_profile`: Synchronizes user power/rank/mastery.
    - `increment_power`: Handles power level updates.

### Setup Instructions
1. Run `justinlimit-site/database-setup.sql` in your Supabase SQL Editor.
2. **Select "Run and enable RLS"** when prompted to ensure security.

---

## 🔑 Required Environment Variables

Configure these in your Vercel Project Settings:

- **GROQ**
  - `GROQ_API_KEY`: API key for Groq inference.
- **SUPABASE**
  - `SUPABASE_URL`: Supabase project URL.
  - `SUPABASE_SERVICE_ROLE_KEY`: Key with RPC/admin privileges.
  - `SUPABASE_ANON_KEY`: Public API key for client-side operations.

---

## 🧪 Local Development

1. Clone and install:
   ```bash
   git clone <repo-url>
   cd justinlimit-site
   ```
2. Create a `.env.local` file with the required environment variables.
3. Run the development server:
   ```bash
   npm i -g vercel
   vercel dev
   ```

---

## 📧 Contact

- Author: JustinLimit
- GitHub: github.com/justinlimit84
- Email: beyond@justinlimit.com
