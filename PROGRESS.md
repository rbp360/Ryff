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
  - Tests: 27/27 Vitest unit tests passing. Full Next.js production build succeeded with zero errors.



