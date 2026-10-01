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
