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
- LLM spend (M4 live red-team security testing): $0.001230 across 15 attack vectors (100% pass rate).
- Total LLM spend to date (M0 + M1 + M2 + M3 + M4 Security): ~$0.085 (Well within $500 budget cap).


