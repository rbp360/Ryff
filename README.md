# Ryff — Guitar Intelligence, Rig Registry & AI Gear Assistant

Ryff is an automated guitar gear intelligence engine, Rig Passport management platform, and multi-persona AI sparring environment.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v20+ or v22+ recommended)
- **pnpm** (Package manager: `npm install -g pnpm`)
- **Docker Desktop** (Required for the local RSSHub and Redis feed scraping bridge)
- **PostgreSQL Database** (Neon Serverless Postgres recommended)
- **Google Gemini API Key** (`GEMINI_API_KEY`)

---

### 2. Environment Configuration
Ensure `.env.local` exists in the repository root with your API keys and configuration:

```bash
# App Configuration
PORT=3000
NODE_ENV=development
SESSION_SECRET=your-32-char-min-session-secret-key

# Database (Neon Serverless Postgres)
DATABASE_URL="postgresql://user:password@host/neondb?sslmode=require"

# AI Provider (Google Gemini)
GEMINI_API_KEY=your_gemini_api_key
MODEL_FAST=gemini-3.5-flash-lite
MODEL_SMART=gemini-3.5-flash

# Image Uploads (Cloudinary)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset
```

---

### 3. Start the Docker Services (Crucial for RSS & Social Feeds)
Ryff uses **RSSHub** and **Redis** running inside Docker to scrape Instagram and social channels (e.g. Marshall Amps, PRS, Crimson Guitars, creator channels) on `http://localhost:1200`.

Start the Docker containers before running the pipeline or dev server:

```bash
docker compose up -d
```

Verify that RSSHub is running:
- Open [http://localhost:1200](http://localhost:1200) in your browser (should return the RSSHub welcome page).
- To view Docker logs: `docker compose logs -f rsshub`

---

### 4. Install Dependencies & Start the Web App

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view Ryff:
- **Feed & Digest:** [http://localhost:3000/digest](http://localhost:3000/digest)
- **Rig Passport:** [http://localhost:3000/passport](http://localhost:3000/passport)
- **Backstage Bot Arena:** [http://localhost:3000/backstage](http://localhost:3000/backstage)
- **Admin Command Centre:** [http://localhost:3000/admin](http://localhost:3000/admin)

---

### 5. Running the Pipeline & Refreshing Feeds

Ryff features an automated pipeline that ingests feeds, clusters stories, generates summaries via `gemini-3.5-flash-lite`, runs multi-bot sparring debates via `gemini-3.5-flash`, matches Reverb deals, and purges stale data.

#### Run the Master Pipeline Manually:
```bash
pnpm run pipeline
```

#### Re-seed or Refresh Feed Sources:
```bash
pnpm run seed:sources
```

#### Automated Scheduled Runs:
In production, GitHub Actions triggers the pipeline twice daily at `06:30` and `18:30` UTC via `.github/workflows/pipeline.yml`.

---

## 🛠️ Tech Stack
- **Framework:** Next.js (App Router), React 19, TypeScript
- **Styling:** Vanilla CSS & TailwindCSS utilities
- **Database:** PostgreSQL (Neon serverless with `@google/genai` and `postgres.js`)
- **AI Models:** Google Gemini Flash (`gemini-3.5-flash-lite` for batch summarization, `gemini-3.5-flash` for multi-agent sparring)
- **Feed Scraping:** `rss-parser`, `youtube-transcript`, RSSHub Docker bridge
