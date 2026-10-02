# PLAN.md — Streamlined UX Restructure Implementation Plan

## Overview
Rebuilding the RYFF presentation layer to match `tokens.css`, `ryff.css`, and `reference.html`. Preserves all Next.js App Router capabilities, Postgres database queries, Gemini LLM pipelines, and Reverb deal tracking while replacing cluttered screens with uncluttered SongDeck minimalist aesthetics.

---

## Stage Mapping & File Touches

### Stage 1: Foundation, App Shell & Home Screen (Current)
- `src/app/tokens.css`: Verify CSS variables (`--bg`, `--sf`, `--ln`, `--tx`, `--mu`, `--ac`, `--ac2`, `--r`).
- `src/app/ryff.css`: Loaded after `tokens.css`; contains all component and layout styling.
- `src/app/layout.tsx`: Load `tokens.css` and `ryff.css`; import Google Font Montserrat (and Lemon Milk fallback).
- `src/app/(app)/layout.tsx`: Build `#stage` and `#app` wrapper with top bar (`hdr`) and persistent 5-button bottom `<nav>` (`Home`, `Digest`, `Backstage`, `Trader`, `Rig room`).
- `src/app/(app)/page.tsx`: Rebuild Home to match `SC.home`:
  - Real activity strip (sources count, new stories in 24h, gear matches, debate ready link).
  - Up to date timestamp line.
  - Hank's takeaway card (from latest episode).
  - Needs attention section (guitars overdue for restringing; hidden if none).
  - 4 Explore mode tiles linking to Digest, Backstage, Trader, Rig room.
  - Minimal legal footer.
- **Test Checkpoint 1:** Verify shell rendering, active tab styling, and Home real data.

### Stage 2: Digest ("Today's Gear Radar") & Trader
- `src/app/(app)/digest/page.tsx`: Elevated dedicated screen for "Today's Gear Radar" using `SC.digest` card patterns, category filter pills, `Matches: <gear>` tags, 16:9 thumbnail placeholders, and Hank/Vee takes.
- `src/app/(app)/trader/page.tsx`: Build Trader matching user wants list from `deals` table (price, original price, price drop, days-on-market, outbound links). No filters.
- **Test Checkpoint 2:** Test article feed and marketplace deals.

### Stage 3: Backstage (1-v-1 Bot Chat)
- `src/app/(app)/backstage/page.tsx`: 1-on-1 bot chat with Hank and Vee selector, message bubbles, bot avatars, and sticky input bar connected to `/api/chat`.
- **Test Checkpoint 3:** Live test interactive chat with personas.

### Stage 4: Rig Room (Gear Grid, Voice Logging, Item Detail, Central Log & Wants)
- `src/app/(app)/rig/page.tsx`: 3-segment control (`Gear | Log | Wants`).
  - Gear: 2-column photo grid with string health colors; bottom bar with quick-mic audio logging.
  - Log: Chronological maintenance timeline across all gear with "+ Add entry" form.
  - Wants: 2-column dashed wants tracking grid.
- `src/app/(app)/rig/[id]/page.tsx`: Restructure item detail to match reference: 4:3 photo, spec summary, 1-tap audio voice logger, history timeline, and "In the news".
- **Test Checkpoint 4:** Test gear browsing, voice logging, and maintenance timeline.

### Stage 5: Setup, Clean-up & Hero Plan
- `src/app/(app)/setup/page.tsx`: Personality, preferences, sources, alerts, and account sign-in/out.
- Verify responsiveness and clean up obsolete Tailwind classes.
- `HERO_PLAN.md`: Copy and wireframe plan for marketing hero.
- **Test Checkpoint 5:** Production build test (`pnpm build`).
