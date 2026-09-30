# Ryff - Feature & Capabilities Documentation

Welcome to **Ryff**—a niche AI chatbot network where two AI personas (Hank: grumpy luthier, Vee: modern gear deal hunter) debate daily gear news and interact with signed-in users.

---

## 🌟 Core Concept & Vision

- **Fictional Persona Debate:** Autonomous daily debate between Hank and Vee summarizing ingested gear news, YouTube channels, and marketplace deals.
- **Private Personalised Chat:** Users chat 1:1 with Hank or Vee using their personal gear rig & wantlist, backed by pre-computed Reverb deals.
- **Sandboxed & Cost-Controlled:** Strict token limits, cohort caps, prompt caching, and zero tool execution for safe, capped costs.

---

## 🚀 Implemented Features

### 1. Project Scaffold (M0 - Checkpoint 1)
- **User-Level Overview:** 
  Establishes the foundation of the Ryff web application, setting up the Next.js framework, strict TypeScript safety, environment configuration templates, and automated continuous integration testing workflows.
- **Code-Level Implementation:**
  - **Framework:** Next.js (App Router, `src/` layout) + TypeScript (`"strict": true` in [`tsconfig.json`](file:///c:/Users/rob_b/Ryff/tsconfig.json)).
  - **Package Management:** `pnpm@12.8.1` configured via `packageManager` in [`package.json`](file:///c:/Users/rob_b/Ryff/package.json).
  - **Dependencies:** `@google/genai`, `@anthropic-ai/sdk`, `postgres`, `rss-parser`, `zod`, `jose`, `tailwindcss`, `vitest`, `tsx`, `@neon/config`.
  - **Workflows:** [`.github/workflows/ci.yml`](file:///c:/Users/rob_b/Ryff/.github/workflows/ci.yml) (typecheck, lint, test) & [`.github/workflows/pipeline.yml`](file:///c:/Users/rob_b/Ryff/.github/workflows/pipeline.yml) (twice daily cron schedule).
  - **Environment & Security:** [`.env.example`](file:///c:/Users/rob_b/Ryff/.env.example) and [`.gitignore`](file:///c:/Users/rob_b/Ryff/.gitignore) set up to safeguard secrets (`DATABASE_URL`, `GEMINI_API_KEY`, `SESSION_SECRET`).

---

### 2. Database Schema & Migration Runner (M0 - Checkpoint 2)
- **User-Level Overview:**
  Sets up the persistent database backend hosted on Neon Serverless Postgres to store feed sources, ingested news items, pipeline execution logs, Hank-vs-Vee daily debate episodes, user profiles & rig lists, Reverb marketplace deals, user chat history, daily usage accounting, and click analytics.
- **Code-Level Implementation:**
  - **Schema Definition:** [`db/migrations/0001_init.sql`](file:///c:/Users/rob_b/Ryff/db/migrations/0001_init.sql) defining 12 relational tables (`sources`, `items`, `pipeline_runs`, `episodes`, `invite_codes`, `users`, `rig_items`, `deals`, `messages`, `usage_daily`, `clicks`, `events`, `feedback`).
  - **Full-Text Search:** Generated `tsvector` column on `items(search)` indexed via GIN for fast full-text article retrieval.
  - **Migration Runner:** [`scripts/migrate.ts`](file:///c:/Users/rob_b/Ryff/scripts/migrate.ts) executing SQL migrations in file order inside transactions with automated `schema_migrations` tracking.
  - **Neon Link:** Linked Neon project (`long-unit-22661455`) with [`neon.ts`](file:///c:/Users/rob_b/Ryff/neon.ts) configuration and `.env.local` credentials.

---

### 3. API & Feeds Ingestion (M0 - Checkpoint 3)
- **User-Level Overview:**
  Configures external news RSS sources, YouTube channel video feeds, model token pricing, daily budget caps, database seeder, and feed verification scripts. Captures raw sample responses from publishers and Reverb API for offline prompt testing and evaluation.
- **Code-Level Implementation:**
  - **Source Definitions:** [`config/sources.json`](file:///c:/Users/rob_b/Ryff/config/sources.json) containing 42 active sources across editorial RSS feeds (*Guitar World*, *MusicRadar*, *Guitar.com*, *Pedal Haven*, *Gibson Gazette*, *Delicious Audio*, *Electro-Harmonix*, *Wampler Pedals*, *Thorpy FX*, *The Music Zoo*, etc.), XenForo forums (*TDPRI*, *The Gear Forum*, *Rig-Talk*, *Jemsite*, *The Gear Page*), and YouTube Atom channels (*Bernth*, *Ola Englund*, *Paul Davids*, *Marty Music*, *Know Your Gear*, etc.).
  - **Model Pricing & Caps:** [`config/pricing.json`](file:///c:/Users/rob_b/Ryff/config/pricing.json) (Gemini 2.5 Flash/Pro & Claude Haiku/Sonnet pricing) and [`config/caps.json`](file:///c:/Users/rob_b/Ryff/config/caps.json) (cohort caps: `cadre` 10 msgs/day, `public` 3 msgs/day, global $8/day limit).
  - **Database Seeder:** [`scripts/seed-sources.ts`](file:///c:/Users/rob_b/Ryff/scripts/seed-sources.ts) upserting 42 active sources into `sources` DB table (`pnpm seed`).
  - **Feed Checker:** [`scripts/check-feeds.ts`](file:///c:/Users/rob_b/Ryff/scripts/check-feeds.ts) validating HTTP responses, parsing feed items, resolving YouTube Atom channel IDs, saving raw XML/JSON samples in [`fixtures/`](file:///c:/Users/rob_b/Ryff/fixtures) (36 `feed-*.xml` files and `reverb-listings.sample.json`), and recording status in DB.
  - **Prompts Library:** Created persona prompts [`prompts/persona.hank.md`](file:///c:/Users/rob_b/Ryff/prompts/persona.hank.md), [`prompts/persona.vee.md`](file:///c:/Users/rob_b/Ryff/prompts/persona.vee.md), digest system prompts, debate prompts, chat system prompt, and rig parsing prompts in [`prompts/`](file:///c:/Users/rob_b/Ryff/prompts).

---

*(As development progresses through M1–M4, new features will be added here at both User Level and Code Level.)*
