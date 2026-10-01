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

### 4. Guardrails & M1 Test Pipeline (M1 - Checkpoint 1)
- **User-Level Overview:**
  Implements global daily cost controls, cohort caps, database connector, and an isolated pipeline test runner. Validates feed ingestion and debate generation on small data samples without invoking unapproved API calls or leaking spend.
- **Code-Level Implementation:**
  - **Caps & Limits:** [`src/lib/usage.ts`](file:///c:/Users/rob_b/Ryff/src/lib/usage.ts) loaded from [`config/caps.json`](file:///c:/Users/rob_b/Ryff/config/caps.json) enforcing $2.00 max per pipeline run, $8.00 global daily spend limit, and cohort message limits (`cadre` 10 msgs/day, `public` 3 msgs/day). Tested in [`tests/usage.test.ts`](file:///c:/Users/rob_b/Ryff/tests/usage.test.ts).
  - **Database Client:** [`src/lib/db.ts`](file:///c:/Users/rob_b/Ryff/src/lib/db.ts) establishing Neon Postgres client instance.
  - **Pipeline Modules:** Created [`src/pipeline/ingest.ts`](file:///c:/Users/rob_b/Ryff/src/pipeline/ingest.ts), [`src/pipeline/digest.ts`](file:///c:/Users/rob_b/Ryff/src/pipeline/digest.ts), and [`src/pipeline/debate.ts`](file:///c:/Users/rob_b/Ryff/src/pipeline/debate.ts) with sample feed parsing and safe guardian pause points before any external LLM invocation.
  - **Dry-Run Script:** [`scripts/test-pipeline.ts`](file:///c:/Users/rob_b/Ryff/scripts/test-pipeline.ts) executing end-to-end sample ingestion, item query, and Hank vs Vee debate output. Verified clean execution with live API calls (`MODEL_FAST=gemini-3.5-flash-lite`, `MODEL_SMART=gemini-pro-latest`).

---

### 5. Live Feed Ingestion & Batch Item Digest (M1 - Checkpoint 2)
- **User-Level Overview:**
  Fetches live RSS editorial feeds and YouTube video Atom feeds across 43 active sources, deduplicating news items into Postgres. Batches undigested items through Gemini 3.5 Flash-Lite to categorize gear launches, reviews, deals, and hype scores, storing structured metadata in the database.
- **Code-Level Implementation:**
  - **Feed Parser:** [`src/lib/feeds.ts`](file:///c:/Users/rob_b/Ryff/src/lib/feeds.ts) with custom user-agent header, canonical URL sanitization, keyword pre-filtering, and SHA256 URL hashing.
  - **Full Feed Ingest:** [`src/pipeline/ingest.ts`](file:///c:/Users/rob_b/Ryff/src/pipeline/ingest.ts) fetching active database sources, updating `last_fetched_at` / `last_status`, and inserting 830+ live items into Postgres with conflict resolution.
  - **Batch Item Digest:** [`src/pipeline/digest.ts`](file:///c:/Users/rob_b/Ryff/src/pipeline/digest.ts) using `MODEL_FAST` (`gemini-3.5-flash-lite`) to summarize items, classify item types (`launch`, `review`, `deal`, `rumour`, `opinion`, `news`), extract brand tags (`PRS`, `Fender`, `Martin`, `VOX`), evaluate hype (0–5), and validate via Zod schema (`digestOutputSchema`).
  - **Verification Script:** Executed [`scripts/test-ingest-digest.ts`](file:///c:/Users/rob_b/Ryff/scripts/test-ingest-digest.ts) processing 830+ live feed items across 43 sources and 16 batch-digested items for $0.001010 total LLM spend.

---

### 6. 4-Turn Debate Engine, JSON Formatter & Terminal Publisher (M1 - Checkpoint 3)
- **User-Level Overview:**
  Orchestrates the autonomous Hank vs Vee 4-turn debate over digested news stories with structured disagreements and source citations. Formats the full debate transcript into topics with Gemini and publishes episodes to Postgres for terminal viewing.
- **Code-Level Implementation:**
  - **Debate Pipeline:** [`src/pipeline/debate.ts`](file:///c:/Users/rob_b/Ryff/src/pipeline/debate.ts) executing Turn 1 (Hank Opener), Turn 2 (Vee Response), Turn 3 (Hank Rebuttal), Turn 4 (Vee Closing), and JSON Schema formatting validated with Zod.
  - **Master Pipeline CLI Runner:** [`scripts/run-pipeline.ts`](file:///c:/Users/rob_b/Ryff/scripts/run-pipeline.ts) running Ingest → Batch Digest → 4-Turn Debate with real-time spend calculation ($0.001857 total run cost, capped under $2.00) and recording run health in `pipeline_runs`.
  - **Episode Terminal Viewer:** [`scripts/print-episode.ts`](file:///c:/Users/rob_b/Ryff/scripts/print-episode.ts) formatting published episodes (`episodes` table) with headlines, topic debates, and source item link references in terminal.
  - **Command Centre RAG Fix:** Updated [`src/app/admin/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/admin/page.tsx) to match feed status case-insensitively, displaying healthy feeds in green (🟢 OK) and failed feeds in red (🔴 FAIL).

---

### 7. Fixture Freezing & Prompt Versioning Suite (M1 - Checkpoint 4)
- **User-Level Overview:**
  Allows the team to freeze real digested news datasets into timestamped snapshot files and benchmark prompt iterations (`v1`, `v2`) on identical news inputs to evaluate Hank & Vee's voices, disagreement quality, and source grounding.
- **Code-Level Implementation:**
  - **Dataset Freezing:** [`scripts/freeze-items.ts`](file:///c:/Users/rob_b/Ryff/scripts/freeze-items.ts) dumping digested Postgres items to [`fixtures/frozen/items-YYYY-MM-DD.json`](file:///c:/Users/rob_b/Ryff/fixtures/frozen/items-2026-09-30.json).
  - **Prompt Version Directories:** Created [`prompts/v1/`](file:///c:/Users/rob_b/Ryff/prompts/v1) and [`prompts/v2/`](file:///c:/Users/rob_b/Ryff/prompts/v2) for persona and formatting prompt evolution.
  - **Versioned Debate Evaluator:** [`scripts/test-eval-prompt.ts`](file:///c:/Users/rob_b/Ryff/scripts/test-eval-prompt.ts) supporting `--from-fixture <file>` and `--version <v1|v2>` flags to test and compare character takes against fixed benchmark data.

---

### 8. Master Pipeline Orchestrator & Automated Retention (M2 - Checkpoint 1)
- **User-Level Overview:**
  Unified orchestration layer that executes the twice-daily automated publication pipeline. Integrates live feed ingestion, batch article digestion, 4-turn Hank vs Vee debate formatting, data retention enforcement, and per-stage cost/health accounting into the persistent Postgres database.
- **Code-Level Implementation:**
  - **Master Orchestrator:** [`src/pipeline/index.ts`](file:///c:/Users/rob_b/Ryff/src/pipeline/index.ts) running Stage 1 (Ingest), Stage 2 (Digest), Stage 3 (Debate & Formatter), and Stage 4 (Retention) with comprehensive error handling, spend caps, and failure isolation preserving previous published episodes.
  - **Data Retention Purge:** `runRetentionCleanup()` purging ingested items older than 30 days and chat messages older than 90 days.
  - **CLI Runner Integration:** [`scripts/run-pipeline.ts`](file:///c:/Users/rob_b/Ryff/scripts/run-pipeline.ts) adapted to invoke `runPipeline()` with typed options and status reporting.
  - **Automated Workflow:** [`.github/workflows/pipeline.yml`](file:///c:/Users/rob_b/Ryff/.github/workflows/pipeline.yml) configured for UTC cron execution (`30 6,18 * * *`) and on-demand manual dispatch.

---

### 9. Public Web & Episode Archive Pages (M2 - Checkpoint 2)
- **User-Level Overview:**
  Delivers responsive, mobile-first public pages for browsing the latest Hank vs Vee debate episode and historical episode archives. Each episode clearly presents character positions, disagreement takeaways, and clickable outbound source links with `rel="noopener nofollow"`.
- **Code-Level Implementation:**
  - **Dynamic Episode Archive View:** [`src/app/episodes/[id]/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/episodes/[id]/page.tsx) rendering individual past episodes by ID with full Hank vs Vee interaction cards, disagreement callouts, adjacent episode navigation, and mandatory AI character disclaimer.
  - **Clickable Source Attribution:** Database query resolving `source_item_ids` to canonical article URLs, titles, and publisher names, replacing raw token placeholders with safe, outbound `rel="noopener nofollow"` links.
  - **Home Page Navigation & Archive:** [`src/app/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/page.tsx) updated with recent episode grid, categorized news stream, command centre quick-links, and legal policy navigation.

---

### 10. Legal Compliance Pages & Admin Command Centre (M2 - Checkpoint 3)
- **User-Level Overview:**
  Implements full legal and regulatory compliance pages covering UK GDPR, user data rights, 90-day chat retention rules, 18+ age restrictions, AI character disclaimers, and transparent affiliate marketing disclosure. Upgrades the Admin Command Centre to track live system spend against daily caps, the last 20 pipeline executions, and per-stage statistics.
- **Code-Level Implementation:**
  - **Privacy Policy Page:** [`src/app/legal/privacy/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/legal/privacy/page.tsx) detailing UK GDPR compliance, 90-day chat message retention schedule, account deletion rights, and zero third-party tracking cookie policy.
  - **Terms of Service Page:** [`src/app/legal/terms/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/legal/terms/page.tsx) outlining 18+ age gating, synthetic character entertainment disclaimers, no-advice guarantees, and security rules against prompt injection.
  - **Affiliate Disclosure Page:** [`src/app/legal/disclosure/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/legal/disclosure/page.tsx) compliant with ASA and FTC guidance, declaring Reverb commercial relationships and enforcing editorial ranking integrity (deals ranked by rig fit, never by commission).
  - **Admin Command Centre Upgrades:** [`src/app/admin/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/admin/page.tsx) displaying the last 20 pipeline executions with stage metrics, real-time daily compute spend vs $8.00 global budget cap gauge, database ingestion counters, and live feed source statuses.

---

### 11. Production Build & Static Verification Suite (M2 - Checkpoint 4)
- **User-Level Overview:**
  Validates the entire M2 scaffold for continuous deployment readiness on Vercel, ensuring zero build errors, zero type errors, fast Turbopack compilation times (<1.5s), and complete test coverage without invoking external AI API calls.
- **Code-Level Implementation:**
  - **Turbopack Build Optimization:** Refactored [`src/lib/env.ts`](file:///c:/Users/rob_b/Ryff/src/lib/env.ts) to eliminate dynamic filesystem tracing warnings during Next.js server compilation.
  - **Static Type Safety:** `pnpm typecheck` (`tsc --noEmit`) passing with 0 errors across all routes, components, and server scripts.
  - **Automated Test Suite:** `pnpm test` (`vitest run`) validating cost calculations, usage caps, and schema parsing across test suites.
  - **Production Build:** `next build` generating static and dynamic routes (`/`, `/episodes/[id]`, `/admin`, `/login`, `/legal/privacy`, `/legal/terms`, `/legal/disclosure`) in 1.3s with zero build warnings.

---

*(As development progresses through M1–M4, new features will be added here at both User Level and Code Level.)*




