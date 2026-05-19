# I Built an Open-Source AI Tools Directory with 850+ Tools — Here's Why and How

**TL;DR**: An open-source, cyberpunk-styled AI tools navigation site with 850+ curated tools, real-time updates, trending charts, and a community. Built with Next.js + Prisma + Supabase. Free to use and open-source on GitHub.

## The Problem

Every day, a dozen new AI tools pop up. ChatGPT, Claude, Midjourney, Runway, Perplexity... the list never ends. I found myself bookmarking tools across different tabs, forgetting about useful ones, and having no way to compare them side by side.

So I built **AI Hub** — a centralized directory that does three things:

1. **Curates** — 850+ AI tools across 16 categories (chat, image, video, code, audio, writing, and more)
2. **Keeps fresh** — Daily crawlers fetch new tools from GitHub, Product Hunt, and RSS feeds
3. **Lets you contribute** — Share tools, write comments, and engage with the community

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Prisma + Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Crawlers**: GitHub API, RSS, custom scripts (run daily via GitHub Actions)

## Features That Stand Out

### 🏠 Homepage with Real-time News & Trends
Not just a boring list. The homepage shows the latest AI news, trending tools, and community shares — all updated daily.

### 🔍 Smart Search with Relevance Scoring
Search by name, description, or tags with keyword-based relevance sorting. Results are weighted — exact matches rank higher than partial ones.

### 📊 Trend Charts for Every Tool
Each tool page shows a 7-day popularity trend chart. See which tools are gaining traction at a glance.

### 🎨 Cyberpunk UI
Dark theme with neon green (#00ff88), cyan (#00d4ff), and magenta (#ff00ff) accents. CRT scanlines, glitch effects, and clip-path chamfer corners. Because AI tools deserve a futuristic look.

### 👥 Community Features
- Share tools with others
- Write comments and reviews
- "Life Circle" feed for community posts
- User profiles with activity history

### 🔄 Daily Auto-Crawling
New tools are automatically discovered and imported from:
- GitHub API (recent AI projects)
- Product Hunt (AI-related launches)
- RSS feeds from major tech publications
- Manual submissions with admin review

## What's Next

I'm actively working on:
- **Phase 1**: Notification system for tool updates and community interactions
- **Phase 2**: Points and level system to reward contributors
- **Phase 3**: Deeper social features and ecosystem expansion

## Try It Out

**Live site**: [https://ai999999.top](https://ai999999.top)
**GitHub**: [https://github.com/YD4223/aihub](https://github.com/YD4223/aihub)

It's completely free, open-source, and I'd love to hear your feedback. If you find it useful, drop a ⭐ on GitHub — it helps more people discover it.

---

*Have you built something similar? Or know an AI tool that should be listed? Let me know in the comments!*
