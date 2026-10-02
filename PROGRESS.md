# PROGRESS.md — Build & Milestone Progress Log

## M0 — Preflight
- Finished: 2026-09-30
- Dependencies verified: Gemini API, Neon Postgres, RSS/YouTube feeds, Reverb API listings.
- LLM spend: <$0.01

## M1 — Terminal Episode
- Finished: 2026-09-30
- Ingest, batch digest, 4-turn debate pipeline, prompt versioning, and test fixture freezing.
- LLM spend: ~$0.05

## M2 — Automated & Public
- Finished: 2026-10-01
- Public episode pages, automated GitHub Actions workflow, retention jobs, `/admin` command centre, legal disclosure drafts.
- Live URL: `ryff-one.vercel.app`
- LLM spend: ~$0.02

## M3 — Accounts, Rig, Chat, Deals [COMPLETED]
- Finished: 2026-10-01
- Delivered:
  - Invites seeding (`scripts/create-invites.ts`) & signed JWT session auth.
  - Interactive `/rig` page with gear parsing, category detection, and budgets.
  - Reverb deals matcher (`src/pipeline/deals.ts`) for user wants.
  - Two-way interactive chat at `/chat` with Hank & Vee tabs, source badges, deal links, and daily quota tracker.
  - Spend caps & rate limiting (`src/lib/usage.ts`) enforcing the 10 msgs/day cadre quota with persona fallback messages.
  - Outbound allowlisted redirects (`/api/out`) with click tracking.
  - 20-question evaluation suite (`evals/run-evals.ts`) executed.
- LLM spend (actual): $0.004358 across all 20 eval tests (avg $0.000218/query vs ≤$0.004 target).
- Acceptance tests: All 8 criteria passed.
- Unit tests: 18/18 passing in Vitest.

## M4 — Harden, Dogfood & Cadre Launch Scaffold [SCAFFOLD READY]
- Status: Development / Scaffold Complete (Invites paused until founder testing sign-off)
- Delivered in Scaffold:
  - 10-category red-team attack evaluation dataset created at `evals/redteam.json`.
  - Deterministic red-team evaluation test harness (`evals/run-redteam.ts`) passing 12/12 checks offline.
  - Risk register and residual security posture documented in `docs/risks.md`.
  - 30-second onboarding flow at `/onboarding` ("add 3 pieces of gear you own and 1 you want", plus suggested starter questions).
  - Compliance & legal suite: UK GDPR privacy policy with 90-day retention notice & instant account deletion (`/api/account/delete`), Terms of Service (18+ requirement, AI personas disclaimer), and Affiliate Disclosure on all pages with `/api/out` links.
  - Admin command centre enhanced with flagged message triage queue, user feedback & survey logs, cohort metrics, and >50% daily spend alert banner.
  - Cohort tagging (`cadre`/`public`) and UK residency collection in auth.
  - Typecheck (0 errors), Lint (0 errors/warnings), and 18/18 Vitest unit tests passing.
## M5 — Feed Intelligence, Hype Clustering & Personalization [COMPLETED]
- Finished: 2026-10-02
- Delivered:
  - **Topic Clustering & Multi-Source Buzz Engine** (`src/lib/clustering.ts`):
    - Replaced blind 24-item timestamp digest with multi-source topic clustering.
    - Automatic entity extraction for notable players (*Impellitteri, Slash, Clapton, Mayer, etc.*) and Rigistry brand catalog.
    - Grouped cross-outlet articles into `story_clusters` and computed multi-source `buzz_count`.
  - **Conversational 35-50 Word Editorial TLDR** (`src/pipeline/digest.ts`, `prompts/digest.system.md`):
    - Upgraded digest prompt to write natural editorial lead-ins explaining what the gear is and why it matters.
    - Extracted category, products, players, hype (0-5), and controversy (0-5).
  - **Personalization Engine & Feedback APIs** (`src/lib/personalization.ts`, `/api/preferences`, `/api/reactions`, `/api/feed`):
    - SQL-based personalized affinity scoring combining cluster buzz, player matches (+6), wanted gear (+5), followed brands (+4), owned gear (+2), and freshness bonus.
    - Thumbs Up (+3) and Thumbs Down (-1.5 soft dampener) interactive feedback without blacklisting.
  - **Redesigned Today's Gear Radar UI** (`src/app/FeedSection.tsx`, `src/app/page.tsx`):
    - Tabbed navigation: "For Your Rig & Tastes" vs "Global Gear Buzz".
    - Category pills: Guitars, Amps, Pedals, Modellers, Artists, Deals.
    - Match badges: `🎯 Wanted`, `🎸 Artist Match`, `🏷️ Followed Brand`, `🔥 Outlets Buzz`, `⚡ High Debate`.
    - Modal to easily customize followed brands and favorite players.
    - Interactive 👍/👎 buttons and quick "Ask Hosts" deep-link into `/chat`.
  - **2-Act Daily Debate Restructure** (`src/pipeline/debate.ts`, `prompts/debate.opener.md`, `prompts/debate.reply.md`, `prompts/format.system.md`):
    - Restructured debate into Act 1 (The Main Event industry consensus) and Act 2 (Community Wildcard & Deal Debate).
    - Upgraded `/chat` retrieval context to incorporate user tastes and personalized feed items.
  - Tests: 36/36 Vitest unit tests passing. Full Next.js production build succeeded with zero errors.

## M5.1 — YouTube CC & Transcript Parsing Pipeline [COMPLETED]
- Finished: 2026-10-02
- Delivered:
  - **YouTube CC Extraction Engine** ([`src/lib/youtube.ts`](file:///c:/Users/rob_b/Ryff/src/lib/youtube.ts)):
    - Lightweight, zero-cost public caption parsing with primary InnerTube and secondary watch-page XML/JSON3 fallbacks.
    - URL parsing across standard `watch?v=`, `youtu.be/`, `shorts/`, and `embed/` formats.
    - HTML entity decoding and polite 1-second rate-limiting delays.
  - **Database Migration** ([`db/migrations/0005_item_transcripts.sql`](file:///c:/Users/rob_b/Ryff/db/migrations/0005_item_transcripts.sql)):
    - Added `transcript text` column with index to cache extracted closed captions.
  - **Digest Pipeline & Prompt Engineering** ([`src/pipeline/digest.ts`](file:///c:/Users/rob_b/Ryff/src/pipeline/digest.ts), [`prompts/digest.system.md`](file:///c:/Users/rob_b/Ryff/prompts/digest.system.md)):
    - Automatically attaches `<transcript>` context to `<item>` blocks when `kind === 'youtube'`.
    - Editorial prompt filters sponsor spots (e.g. Ridge Wallet, BetterHelp) and intro banter, distilling host verdict and gear pros/cons into a 35-50 word editorial summary.
    - Graceful fallback for non-captioned or instrumental playthrough videos.
  - **Unit Tests** ([`tests/youtube.test.ts`](file:///c:/Users/rob_b/Ryff/tests/youtube.test.ts)):
    - 9 dedicated unit tests passing; 36/36 total Vitest suite tests passing.

## M6 — Gear Detail Pages, Voice Logging & Maintenance Tracking [COMPLETED]
- Finished: 2026-10-02
- Delivered:
  - **Database Migration** ([`db/migrations/0008_rig_item_logs_and_details.sql`](file:///c:/Users/rob_b/Ryff/db/migrations/0008_rig_item_logs_and_details.sql)):
    - Added structured columns (`serial_number`, `purchase_date`, `current_strings`, `last_restrung_at`, `pickups_summary`, `modifications_summary`, `valves_summary`, `last_valves_changed_at`) to `rig_items`.
    - Created `rig_item_logs` table for tracking maintenance, string changes, valve replacements, component modifications, and notes.
  - **Multimodal AI & Voice Parser** ([`src/lib/gear-parser.ts`](file:///c:/Users/rob_b/Ryff/src/lib/gear-parser.ts), [`src/app/api/rig/[id]/log/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/rig/[id]/log/route.ts)):
    - Real-time Gemini Flash extraction for audio voice memos (15s recording cap) and natural language text logs.
    - Intelligently extracts component changes (*e.g., Elixir 9-46 restring, Lavarack ~9k bridge pickup swap, R2 resistor 280k sweep mod*), original parts retained in cases/boxes, and auto-updates the parent gear spec sheet.
  - **Individual Gear Page UI** ([`src/app/rig/[id]/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/rig/[id]/page.tsx)):
    - Dedicated gear detail card with serial number, purchase date, pickup breakdown, and mod notes.
    - Built-in 15s audio recorder with live countdown timer + quick text log bar.
    - Visual string health indicators with color-coded alerts (*Restrung 4d ago* vs *⚠️ Restrung 6mo ago*).
    - Chronological event timeline of all repairs, setups, string changes, and mods.
    - Updated [`/rig`](file:///c:/Users/rob_b/Ryff/src/app/rig/page.tsx) overview to make all gear items clickable with live string age badges.
  - **Tests**: 39/39 passing in Vitest ([`tests/gear-parser.test.ts`](file:///c:/Users/rob_b/Ryff/tests/gear-parser.test.ts)).

## UX Restructure — Phase 0: Audit [COMPLETED]
- Finished: 2026-10-02
- Delivered:
  - Read-only audit written to `AUDIT.md` (39 lines).
  - Incorporated user directions: Today's Gear Radar separated into dedicated Digest page, 1-v-1 bot interaction, voice logging retained, admin/login unlinked from consumer shell.
  - Zero application code changed.
- Next: Stage 1 — Foundation, App Shell & Home Screen.

## UX Restructure — Stage 1: Foundation, App Shell & Home Screen [COMPLETED]
- Finished: 2026-10-02
- Delivered:
  - Created `PLAN.md` and `GAPS.md` documenting architecture, phases, and model deviations.
  - Linked `tokens.css`, `ryff.css`, and Google Font Montserrat into root layout.
  - Created persistent mobile-first `#stage` and `#app` layout with 5-tab bottom navigation (`Home`, `Digest`, `Backstage`, `Trader`, `Rig room`).
  - Rebuilt Home screen (`src/app/(app)/page.tsx`): Header with setup gear, real activity metrics (47 sources, 81 new stories), Hank's takeaway card, real overdue gear in "Needs attention", 4 Explore tiles, and subtle legal footer.
  - Verified with 0 TypeScript errors, successful Next.js production build (`next build`), and browser inspection.
- Next: Stage 2 — Digest ("Today's Gear Radar") & Trader.
