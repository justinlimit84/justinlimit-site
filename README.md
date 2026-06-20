# JustinLimit AI - High-Speed Anime Chat Hub

A production-ready, highly scalable, and ultra-fast AI chat platform allowing concurrent users to interact in real time with dynamic anime character profiles (Goku, Naruto, Sasuke, Sakura, and Sarada). 

The platform is optimized for performance, security, and high concurrency by migrating from a rate-limited public chat proxy to a dedicated serverless architecture powered by Vercel and Groq.

---

## 🚀 Key Features

* **High Speed & Low Latency:** Utilizes Groq's high-performance hardware running the `llama-3.1-8b-instant` model to achieve near-instantaneous (sub-second) response times.
* **Massive Concurrency:** Powered by Vercel Edge Serverless Functions, ensuring the backend can handle thousands of concurrent visits simultaneously without putting users in a queue.
* **Robust Security Layer:** The frontend never exposes secret API tokens. Request tracking and credential validation are isolated securely within a stateless backend api route.
* **Mobile-Responsive UI:** Featuring a custom cyberpunk dark layout with active character selection modules that scale fluidly to any mobile viewport.

---

## 🛠️ Architecture & Stack Migration

### Old Architecture (Bottlenecked)

[ User Browser ] ───> [ GitHub Pages (Static Hosting) ]
└──> Direct Public API Request ───> [ Rate-Limited Global Proxy ] (High delays, 500 errors under load)

### New Production Infrastructure (Scalable)

[ User Browser ] ───> [ Custom Domain: justinlimit.com ]
└──> [ Vercel Global Edge Network ]
└──> Serverless Function (/api/chat)
└──> [ Secure Groq API Endpoint ]

---

## 📁 Repository Structure

```text
├── index.html          # Frontend single-page application (UI & states)
├── api/
│   └── chat.js         # Serverless Node.js backend route (Groq controller)
└── README.md           # Project documentation

🔧 Backend Implementation Summary (api/chat.js)
The serverless backend handles execution routing and data protection rules:

Method Enforcement: Restricts access to standard POST request channels.

Environment Isolation: Safely reads process.env.GROQ_API_KEY entirely away from user visibility.

Array Sanitization: Filters conversational memory payload formats to avoid structural payload rejections before querying Groq's gateway.

Resilient JSON Mapping: Converts streaming headers to precise string configurations using clean, sanitized text parsing boundaries to maintain an ultra-stable connection.

⚙️ Configuration & Deployment History
AI Framework Migration: Upgraded from the deprecated llama3-8b-8192 framework engine to the current stable production standard llama-3.1-8b-instant.

Vercel Deployment Setup: Linked GitHub repository hooks straight into the Vercel cloud container ecosystem for automatic Git-based edge routing compilations.

Secure Environment Provisioning: Saved global backend credentials safely within the Vercel Application settings pipeline.

Custom DNS Routing: Updated GoDaddy DNS Zone settings, replacing legacy static A-Records with Vercel's multi-region anycast edge IP (76.76.21.21) and pointed the root www CNAME tracking parameters to cname.vercel-dns.com.
