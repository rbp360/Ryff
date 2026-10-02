# AUDIT.md — RYFF UX & Codebase Audit (Phase 0)

## 1. Existing Routes & Screens
- `/` (`src/app/(app)/page.tsx`): Current monolithic home containing episode debate, archive, and `FeedSection` ("Today's Gear Radar").
- `/rig` (`src/app/(app)/rig/page.tsx`): Multi-line text entry + list of owned/wanted gear with string health badges.
- `/rig/[id]` (`src/app/(app)/rig/[id]/page.tsx`): Detailed gear specs, audio voice logger (Gemini Flash), maintenance timeline.
- `/chat` (`src/app/(app)/chat/page.tsx`): 1-on-1 chat with Hank or Vee, daily quota meter, Reverb deal mentions.
- `/digest` (`src/app/(app)/digest`): Empty directory. Target for dedicated "Today's Gear Radar" / Digest feed.
- `/trader` (`src/app/(app)/trader`): Empty directory. Target for used deals matched to wants.
- `/admin`, `/login`, `/onboarding`, `/legal/*`: Admin queue, auth, legal policies.

## 2. Key Components
- `FeedSection.tsx` (`src/app/(app)/FeedSection.tsx`): Multi-source clustered gear radar, category filters, like/dislike, preferences modal.
- `src/lib/personalization.ts`: `getPersonalizedFeed()`, `getGlobalTopFeed()`, preference scoring.
- `src/lib/gear-parser.ts`: Multimodal audio & text parser extracting gear specs and maintenance logs.
- `src/pipeline/deals.ts` & `src/lib/reverb.ts`: Reverb scraper & wants matcher with price drop tracking.
- `src/app/api/chat/route.ts`: Streaming/stateless LLM chat with Hank & Vee personas.

## 3. Data Models (Postgres / Neon)
- `sources` (RSS, YouTube channels, active status, last fetch).
- `items` (scraped feed items, headline, summary, image_url, brands, products, hype, buzz_count, cluster_id).
- `story_clusters` (multi-outlet story clusters and buzz counts).
- `episodes` (daily published debates, topics JSON with Hank/Vee exchanges, transcripts).
- `rig_items` (owned/wanted gear, string age `last_restrung_at`, category, brand, model, specs).
- `rig_item_logs` (maintenance events: string_change, setup, repair, valve_change, note).
- `deals` (Reverb listings for wanted items: title, price_amount, original_price_amount, price_drop_text).
- `users` & `item_reactions` (preferences, followed brands, favorite players, likes/dislikes).

## 4. Current Styles vs. New Design Tokens
- Current: Tailwind CSS v4 (`globals.css`), slate palette (`bg-slate-950`, `border-slate-800`), cyan accents, emojis.
- Target: `tokens.css` + `ryff.css`. Pure black `--bg: #000`, surface `--sf: #121212`, hairline `--ln: #242424`, SongDeck green `--ac: #22c55e`, blue `--ac2: #38bdf8`, radius `--r: 12px`, Lemon Milk / Montserrat fonts.
- Shell: Mobile-first `#stage` / `#app` with 5 bottom tabs: Home, Digest, Backstage, Trader, Rig room.

## 5. Architectural Adjustments
- Move "Today's Gear Radar" from bottom of Home into dedicated `/digest` tab with token styling.
- Backstage replaces `/chat` as a focused 1-on-1 bot conversation with Hank & Vee.
- Rig room detail retains multimodal voice logging; quick-mic added to Rig room bottom bar.
- Remove `/admin` and `/login` from primary consumer navigation; place simple account link in Setup and legal in footer.
