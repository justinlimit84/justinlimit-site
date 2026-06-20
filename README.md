# JustinLimit AI - High-Speed Anime Chat Hub

A production-ready, highly scalable, ultra-fast AI chat platform that lets concurrent users interact in real time with dynamic anime character profiles such as Goku, Naruto, Sasuke, Sakura, Sara, and more.

The platform is optimized for performance, security, and high concurrency by migrating from a rate-limited public chat proxy to a dedicated serverless architecture powered by Vercel and Groq.

---

## 🚀 Key Features

- High Speed & Low Latency: Uses Groq's high-performance hardware running the `llama-3.1-8b-instant` model to achieve near-instantaneous (sub-second) response times.
- Massive Concurrency: Built on Vercel Edge Serverless Functions to handle thousands of concurrent visits without queuing users.
- Robust Security: Frontend never exposes secret API tokens; credential validation and request tracking happen only in a stateless backend API route.
- Mobile-Responsive UI: Custom cyberpunk dark layout with character selection modules that scale across viewports.

---

## 🛠️ Architecture

Old Architecture (Bottlenecked):

[ User Browser ] → [ GitHub Pages (Static Hosting) ] → [ Public API ] → [ Rate-Limited Proxy ]

New Production Infrastructure (Scalable):

[ User Browser ] → [ Custom Domain: justinlimit.com ] → [ Vercel Global Edge ] → Serverless Function (`/api/chat`) → [ Groq API ]

---

## 📁 Repository Structure

```text
├── index.html          # Frontend single-page application (UI & state)
├── api/
│   └── chat.js         # Serverless Node.js backend route (Groq controller)
└── README.md           # Project documentation
```

## ⚙️ Backend Summary (api/chat.js)

- Method enforcement: accepts POST requests only.
- Environment isolation: reads `process.env.GROQ_API_KEY` on the server; keys are not exposed to clients.
- Payload sanitization: sanitizes conversational memory and streaming payloads before proxying to Groq.
- Robust streaming: handles Groq streaming responses and maps them back to the client reliably.

---

## 📦 Setup & Local Development

1. Clone the repo:

   git clone https://github.com/justinlimit84/justinlimit-site.git
2. Install dependencies (if any) and run a static server for `index.html`.
3. Set environment variables for local development (example using Vercel locally or a .env runner):

   - GROQ_API_KEY — your Groq API key

4. For serverless testing, run Vercel dev or your preferred serverless emulator so `/api/chat` is available locally.

---

## 🔁 Deployment

- Deploy to Vercel for global edge serverless functions. Link this repository to your Vercel project and set `GROQ_API_KEY` in Project Environment Variables.
- Configure DNS (example with GoDaddy): set the apex A record to Vercel's anycast IP (76.76.21.21) or follow Vercel's recommended CNAME setup for `www`.

---

## 🧩 Usage

- Frontend -> Calls `/api/chat` with a sanitized conversation array and chosen character profile.
- Backend -> Validates the request, signs and forwards to Groq with `llama-3.1-8b-instant`, and streams the response back to the client.

Example curl (replace with your tooling if streaming is required):

```bash
curl -X POST "https://your-deployment-url/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"character":"Goku","messages":[{"role":"user","content":"Hi Goku!"}] }'
```

---

## Environment Variables

- GROQ_API_KEY — required. Store this securely in Vercel (or your deployment platform) and never commit it to source control.

---

## Contributing

Contributions are welcome. Open an issue or submit a PR.

---

## License

Specify your license here (e.g., MIT). If you don't have a license, add one or state the terms.

---

## Contact

Author: JustinLimit (github.com/justinlimit84)

If you'd like specific changes to the README (formatting, additional sections, or different content), tell me what to include and I will update it.