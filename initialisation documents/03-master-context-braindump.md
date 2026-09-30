# 03 — Master context & braindump (GuitarBot / "Bot v2.5")

**Written:** 30 Sep 2026. **Purpose:** single source of truth for what has been decided, why, what was dropped, what it costs, what could go wrong and what to do next. Written for an implementing agent and for the founder to re-read.
**Companion files:** `01-repo-scaffold.md` (structure), `02-milestones-m1-m4.md` (build order).

**Confidence labels used below:** **[verified]** = seen in a source during research this conversation; **[single source]** = one source only; **[conflict]** = sources disagree; **[judgement]** = my estimate or opinion, not data; **[unverified]** = from memory or the founder's documents, not checked.

**Start here (agent):** read §0, §6, §11 and §15. Then follow `01` and `02`. Do not add scope. If anything here conflicts with the founder's live instructions, the founder wins; flag the conflict.

---

## 0. TL;DR — the current decision

- **Build:** two fictional persona bots (Hank: grumpy luthier; Vee: modern-gear deal hunter) that argue about the day's guitar-gear news in a public "episode", then let signed-in users chat **privately** with one persona about that news, personalised to their rig and wants, with pre-computed Reverb deals.
- **Why this shape:** the founder prefers and can market a consumer bot; a broadcast-only digest was judged "basically a newsletter"; the cached-debate-then-private-chat architecture keeps the interactive personality while capping cost (expensive multi-bot work runs in batch, users only pay for cheap per-message chat).
- **Money:** free public debate + a few free chats; affiliate commission on Reverb purchases; later a ~£4/month tier (more chat, ask-both, alerts); much later sponsorship and B2B insight from first-party data.
- **Scale of bet:** ~60–80 hours to a working MVP, ~£30–90/month running cost, £500 cash budget, tested first on ~100 friendly guitarists over four weeks, with explicit kill rules at week 8.
- **Honest headline:** this is a low-cost experiment with a modest probability of becoming a small niche business. The margins are thin until there are roughly 10–16k engaged monthly users (§7). The B2B ideas are parked, not dead, and the consumer product may produce the first-party data that makes a later B2B version credible.

---

## 1. Founder context and constraints

- Ex-investigator background; solo coder ("some coding ability"). Existing projects: **Rigistry** (gear-logging app with a components/specs schema), **SongDeck** (Next.js / TypeScript / Neon Postgres), **McGee** (AI band-manager agent framework). Some retail contacts in the music industry.
- **Budget:** ~800–1,000 hours and ~£500 cash. Time is not costed in the founder's own maths; at even £30/hour that is £24–30k of opportunity cost, so the plan is built to fail cheaply and early.
- **Explicit stance:** "I am partisan in either respect" — wants honest 360° evaluation, not validation. Prefers the consumer bot, believes they can market it better than a B2B product, and lacks conviction in "brand intelligence".
- **Must-haves stated by the founder:** lean delivery at minimal cost; a clear articulation of how it makes money; a distinct value proposition (B2C or a B2B uplift), not a newsletter.
- **Seed audience:** ~100 guitarists the founder can sign up for free at launch (relationship: friends/contacts, so early metrics will be biased upward; UK share unknown).
- **Developer location:** the redux doc refers to development outside the UK (Cambodia); the founder's location appeared to be Bangkok. Legally irrelevant: UK users are what matter for the UK regime (§11).

---

## 2. How we got here (timeline)

1. **Original idea (consumer):** AI personas (e.g. "the grumpy luthier") autonomously research and post a daily guitar-gear digest for entertainment. Free tier + £3–5/month. Framed as a cheap proof of concept, inspired by Moltbook (autonomous bots interacting publicly, ~1M visitors in a week). Cost model: capped free tier, shared research cache, hard token caps.
2. **Round-1 critique (in the handoff doc):** fragile unit economics; the "PoC for B2B" logic is circular; cost caps fight the virality mechanic; 800–1,000 hours valued at zero; thin product vs ChatGPT scheduled tasks/Perplexity/Feedly; legal exposure (prompt injection, likeness, weak 18+ gating, possible UK Online Safety Act exposure); distribution unproven.
3. **B2B pivot exploration:** "Synthetic Buying Committees" (AI CFO/CISO/end-user pressure-testing a sales pitch). Found real but crowded (Hyperbound, Outdoo, Second Nature); a cheap "backtest" on 5–10 closed-lost deals was proposed. Other pivots explored: generic professional digest; guitar niche as high-disagreement/high-spend; B2B2C retailer newsletters; individualised decision support; niche B2B market intelligence for music brands; legal hostile-briefing tool.
4. **Deep dive on music-trade market intelligence:** data access turned out to be the problem (Reddit cost/ToS, Gear Page terms, YouTube transcripts grey zone); moat thin; TAM small; wrong first outreach targets (Marshall/Thomann too big). Founder then said the AI's own description ("no more complicated than looking at Reverb") undercut the pitch.
5. **Founder pushback:** conviction, marketing ability and clarity matter independently of raw EV.
6. **Independent review (this assistant):** scored four options (Guitarbot as planned; Guitarbot v2 redesigned as broadcast + affiliate + subscription; B2B market intel; B2B buying committee). Verified key claims by research (§5). Concluded the redesigned bot ranks first even ignoring founder fit, while the *original* bot loses to B2B intel once preference is removed. Recommended a capped, broadcast-first v2 with a 4-week gate.
7. **Founder feedback:** the v2 orchestration "wasn't much more than a newsletter". Attached `v2redux.md` (another AI's suggestion: bring back two-way chat via cached daily bot-to-bot debate + rig personalisation).
8. **Research for the build map:** Reverb affiliate terms, Reverb listings API, YouTube RSS and quota limits, Vercel Hobby limits, RSS feed candidates.
9. **Final plan (v2.5):** cache-then-chat architecture, two bots, staged plan M0–M4 + Stage 3, cost caps that keep free users near break-even (§7).
10. **This document set** for an implementing agent in a separate terminal.

---

## 3. Decisions log

| # | Decision | Why | Alternatives rejected | Status |
|---|---|---|---|---|
| D1 | Consumer bot is the primary bet | Founder conviction + marketing edge; lower sales burden; cheap to test | B2B market intel, buying committee | Active |
| D2 | Two bots only for MVP | Enough to test "disagreement as entertainment" at minimal cost | 4–6 personas | Active |
| D3 | Batch debate, private chat over cache | Keeps personality; makes expensive work a fixed daily cost | Live multi-agent chat; public bot-to-bot autonomy | Active |
| D4 | Chat is private 1:1, no sharing, no user-made bots, no comments | Minimises Online Safety Act user-to-user exposure and moderation burden | Public bot interactions (Moltbook style) | Active |
| D5 | Chat answers from cache (no live web in chat) | Cost control + removes the prompt-injection surface of live browsing | Live search per message | Active |
| D6 | Free sources only: news RSS, YouTube channel RSS, Reverb listings | Zero data cost; avoids Reddit contract and transcript ToS grey zone | Reddit API, Gear Page scraping, YouTube transcripts | Active |
| D7 | Model never writes URLs; server renders `[[item:id]]`/`[[deal:id]]` tokens | Prevents link injection and unauthorised affiliate redirects | Free-form links | Active |
| D8 | Scheduler on GitHub Actions | Vercel Hobby cron is once/day and non-commercial | Vercel Cron on Hobby; paid scheduler | Active |
| D9 | Two cap cohorts: `cadre` (generous), `public` (3 msgs/day) | Revenue per free user ≈ £0.08/month; caps must keep average cost near that | One cap for all | Active |
| D10 | Reverb via Awin for affiliate; disclose everywhere | Only mainstream gear marketplace with an accessible programme found; regulatory need | Undisclosed links; ranking by commission | Active |
| D11 | Conviction is a tie-breaker, not a trump card | All EVs are small and uncertain, so conviction legitimately decides within the noise, but cannot override structural blockers | Pure-EV or pure-conviction | Active |
| D12 | Kill rules set in advance (§14) | Founder tendency to drift through six directions | Open-ended build | Active |
| D13 | B2B parked; revisit with first-party data at ≥1,000 MAU | Consumer traction is a weak signal for B2B intelligence, but real user data is a strong asset | Parallel full B2B build | Active |

---

## 4. Abandoned and parked ideas (with revival conditions)

| Idea | Why dropped/parked | Revive if… |
|---|---|---|
| Public autonomous bot-to-bot social (Moltbook clone) | Cost, moderation, Online Safety Act exposure, and Moltbook's virality was a novelty event that isn't repeatable **[judgement]** | Never as-is; public *read-only* debate pages are the safe cousin |
| Broadcast-only email digest (my "v2") | "Basically a newsletter"; commodity | Fallback if chat proves too costly or risky |
| B2B Synthetic Buying Committees | Crowded and funded (Hyperbound, Outdoo, Second Nature); founder lacks sales-domain edge and deal data; SOC 2/GDPR/security-review burden | A sales team offers 5–10 closed-lost deals for the backtest (cost <£30, about a week); kill rule: sim must clearly beat a generic "list likely objections" prompt |
| Niche B2B market intelligence for music brands | Reddit cost/ToS, thin moat, small TAM (many makers are 1–5 people), founder conviction low, "no more complicated than looking at Reverb" | First-party consented question data from the bot (§14) shows repeatable brand-level insight worth £80–250/month |
| B2B2C white-label retailer newsletters | Retailers already send branded newsletters; a "voice skin" adds nothing | Retailer pilot using their own purchase/browsing history for individualised, in-stock recommendations; test against their existing newsletter over ~6 weeks |
| Generic professional digest | Unverified supplier problem; no domain edge | Not planned |
| Legal hostile-briefing tool (Ollama/Qwen, UK public-inquiry angle) | Competitors exist; UK witness-coaching vs familiarisation constraint; local-model hardware and persona-drift issues | Founder chooses to revisit; design as "advocate rehearses against AI witness / AI red-teams case theory" |
| Per-user personalised digests for all free users | Cost ≈ £0.16/user/month vs revenue ≈ £0.08 | Only for paying users |
| Live-search chat | Cost (web search alone is ~$10 per 1,000 searches) and injection surface | Never for free tier |
| Reddit ingestion | Contract needed; price sources conflict (§5) | Paying customers exist |
| YouTube transcripts | Official API captions only for own videos; third-party scraping is grey | Explicit permission or paid provider justified by revenue |
| Vercel cron on Hobby | Once per day, ±59 min, non-commercial only | Vercel Pro |

---

## 5. Evidence base (research findings)

**Moltbook precedent.** Earlier research (source pages not preserved in this doc) found: virality was a novelty event tied to the OpenClaw agent wave, growth was front-loaded, some content was human-injected/fake, founders were hired by Meta, and no coverage described a revenue model. **[medium confidence; re-verify before quoting].** Conclusion: not a repeatable growth template.

**Reddit API.** Free unauthenticated access is blocked; commercial use needs a contract and manual approval. Prices **[conflict]**: sources gave "$12,000/year minimum" and "$12,000/month"; no published rate card; pay-as-you-go around $0.24 per 1,000 calls was mentioned. The handoff's "$12k/year" may understate cost.

**B2B competitors.** Hyperbound (multi-buyer sessions, free tier, ~$15M Series A **[single source]**), Outdoo (up to 3 stakeholders per session, per handoff **[unverified]**), Second Nature ($22M Series B Oct 2025, ~$38M total **[single source]**). Seat pricing **[conflict]**: ~$30–40 vs ~$80–120 per user per month.

**Consumer conversion benchmarks (RevenueCat-sourced, 2026).** Median freemium download→paid ≈ **2.1%**; AI apps ≈ **2.4%**; AI apps churn ~**30% faster** (year-1 retention **21% vs 31%**); revenue per payer ~**41% higher** for AI apps; median subscription price ~$12.99/month **[single source for price]**. £3–5/month is far below the median; test £6–8 and annual.

**ChatGPT scheduled tasks.** One personal-blog source **[single source, low–medium confidence]** says Pulse was sunset in June 2026 in favour of scheduled tasks, with free users getting ~3 active scheduled tasks. Implication: a daily gear digest is available free elsewhere; the persona, the rig-aware layer, the curation and the deals are the differentiation.

**Anthropic API pricing.** Haiku 4.5 at $1 / $5 per million tokens **[verified across sources]**; web search tool ~$10 per 1,000 searches **[verified in official docs]**; newest Sonnet **[conflict]** ($3/$15 vs $2/$10 intro). Prompt-cache multipliers (read ≈ 10% of input price) **[from memory; verify]**. Model IDs per product notes: `claude-haiku-4-5-20251001`, `claude-sonnet-5-5`.

**UK Online Safety Act / Ofcom.** Ofcom's position (as found) is that generative AI chatbots can be in scope when users can share their output with each other or when the tool searches multiple sites/databases; the government said in Feb 2026 it would bring chatbot providers under illegal-content duties **[medium confidence; guidance still moving]**. Extraterritorial reach: applies to services with a significant UK user base or that target the UK (the redux doc's point; consistent with Ofcom's stated approach). Design response: private 1:1 chat, no sharing, no user-made bots, no live search, get a short legal check before strangers.

**Reverb API.** Public listing search at `api.reverb.com/api/listings` works without auth per several third-party scraper listings **[single-type source]**, returns live listings only, max 2,500 results per query (50 pages × 50). Official docs at `reverb.com/page/api` describe HAL+JSON, token auth via `X-Auth-Token`, and endpoints (listings, price_guides, articles, etc.). Sold-price history appears to be undocumented/internal **[single, interested source]**. **Correction to the handoff:** it called this "a genuine, usable public REST API" — true for live listings, not for sold history, and terms of use still need checking.

**Reverb affiliate.** Runs on Awin; Reverb's help page: applicants must apply and be approved, cashback/voucher sites ineligible, commission on order price excluding tax/shipping and reversed on returns, 30-day cookie, creators are steered to "Creators Amplified". Awin's Reverb (US) listing: **5% + $5 per new buyer, 30-day cookie**. Older third-party pages say 1% or 4% + $4 with 7-day cookies **[stale/conflict]**. Programme is labelled US: **UK eligibility unchecked.** Thomann ~3.5–4.5% and Sweetwater per-click **[low confidence, from a fast search]**. Awin minimum payout ~$20 **[single source]**.

**YouTube.** Every channel has a public Atom feed (`/feeds/videos.xml?channel_id=UC…`), latest ~15 uploads, no key, no quota; `playlist_id=UULF…` excludes Shorts **[verified, multiple sources incl. June 2026]**. Data API: 10,000 units/day default; `search.list` 100 units (one source says it moved to its own ~100-calls/day bucket from 1 Jun 2026); `captions.download` only for videos you own (403 otherwise). Commercial use allowed with ToS compliance.

**Vercel.** Hobby: non-commercial personal use only; cron jobs once per day with ±59-minute precision; Pro ~$20/seat/month **[verified in docs]**.

**Audience sizes (approximate, one fast search).** r/Guitar ~3.3M; r/guitarpedals ~325k. Self-promotion is tightly moderated.

**Market-size reports** for guitars/pedals were low-quality mills; ignored.

---

## 6. The current plan (v2.5) in brief

**Value proposition.** "Two opinionated gear nerds who've read everything today, argue about it in the open, and tell you privately what it means for your rig and what's for sale right now."

**Honest moat assessment.** Summarising and rig memory can be approximated by a power user with ChatGPT memory + scheduled tasks. The harder-to-copy parts: a curated source list, Reverb deal-matching against *your* wants, distinctive voices, the cadre community, and (later) consented first-party data. Whether that is enough is exactly what Stage 3 tests.

**Flow (see the architecture diagram in the chat).**
1. GitHub Actions cron, twice daily: ingest RSS/YouTube/Reverb → Haiku digests each item to JSON → Hank vs Vee debate (4 turns on a Sonnet-class model) → Haiku formats to JSON → publish episode; deal matcher refreshes Reverb deals for every distinct "want".
2. Public pages show the latest episode with source links. No login needed.
3. Signed-in users add rig + wants and chat with Hank or Vee. Chat = persona + today's episode (cached prompt block) + retrieved recent items + rig + deals → Haiku, ≤350 tokens out. "Ask both" is a later paid feature (2× cost).
4. All links go through `/api/out` (allowlist, click log, optional Awin wrap).
5. `/admin` shows runs, costs, flagged messages; the founder reviews ~10 minutes a day.

**Personas.** Hank: dry, gruff, craft/vintage, distrusts hype, likes used bargains. Vee: quick, warm, modelling/new tech, value and convenience, teases Hank. Built-in structural disagreement. Fictional archetypes only, no real people.

**Stack.** Next.js + TypeScript + Neon Postgres + GitHub Actions + Anthropic API (Haiku for volume, Sonnet-class for the debate) + Vercel (Pro before affiliate/payments). Details in `01`.

---

## 7. Economics (costs, unit economics, ROI)

**Assumptions (all [judgement] unless stated):** $1 ≈ £0.75; Haiku $1/$5 per M tokens; Sonnet-class ~$3/$15; UK card fees 1.5% + 20p **[from memory]** so a £4 sub nets ≈ £3.74; free→paid 2.1%; affiliate model = 10% of engaged users click a link, 5% of clickers buy, average basket £250, commission 4% (Reverb's listed 5% would be higher).

### 7.1 Running costs (monthly)

| Item | Estimate |
|---|---|
| Digest (Haiku, ~60 new items/day) | ~£4 |
| Debate (Sonnet-class, 2 runs/day, ~$0.25–0.70 each incl. formatting) | ~£12–25 |
| Chat, 100 cadre users (≈£0.002 per message with caching; ~40 msgs/user/month) | ~£10–45 (upper bound = everyone hits the 10/day cap) |
| Hosting | £0 on Hobby pre-commercial; ~£16 (Vercel Pro) once affiliate/payments start |
| Domain | ~£1/month |
| **Total** | **~£30–90/month**; £500 covers 6+ months |

Unbudgeted: a short legal check before strangers arrive (get a quote), Resend/email if used, Stripe fees on revenue.

### 7.2 Cost vs revenue per free user (why caps matter)

| Design | Cost per free user/month |
|---|---|
| Broadcast digest | ~£0.003 |
| Personalised daily digest (Haiku) | ~£0.16 (£0.08 with batch API) |
| Free-form chat, uncached, 5 msgs/day, 1 in 3 with web search | ~£0.94 |
| **Cached private chat, ~25 msgs/month (typical)** | **~£0.05** |
| Cached chat at 3/day cap (worst case) | ~£0.19 |
| Cached chat at 10/day cap (worst case) | ~£0.63 |

Revenue per free user at 2.1% conversion, £3.74 net: **~£0.079/month** (1% → £0.037; 4% → £0.15). Hence the public cap of 3/day and a monthly budget per user.

### 7.3 Engaged users needed for revenue targets (before chat costs)

| Model | ARPU/MAU | MAU for £1k/month | MAU for £3k/month |
|---|---|---|---|
| Subscription only | £0.079 | ~12.7k | ~38.2k |
| Affiliate only | £0.038 | ~26.7k | ~80k |
| Blended | £0.116 | ~8.6k | ~25.9k |

### 7.4 Net after chat costs (blended ARPU £0.116, chat £0.05/MAU, fixed £60)

| MAU | Revenue | Chat cost | Fixed | Net/month |
|---|---|---|---|---|
| 100 | £12 | £5 | £60 | −£53 |
| 1,000 | £116 | £50 | £60 | +£6 |
| 5,000 | £580 | £250 | £60 | +£270 |
| 10,000 | £1,160 | £500 | £60 | +£600 |
| 16,000 | £1,856 | £800 | £60 | ~+£996 |

**Read:** ~£1k/month net needs roughly 16k engaged users at £4. Levers: price £6–8 (at £7, net ARPU per MAU rises to ≈£0.18 → ~8k MAU for £1k net), annual plans, lower chat cost per MAU, higher affiliate yield (Reverb's 5% + new-buyer bonus), sponsorship.

### 7.5 ROI and exposure

- **Time to decision point (week 8):** build 60–80 h + testing/ops ~40 h ≈ **100–120 h** ≈ **£3.0–3.6k** at the handoff's own £30/hour, plus **£250–700 cash** (LLM, hosting, domain; a legal hour may push this over the £500 budget).
- **Outcome ranges (my gut, [judgement]):**

| Outcome | Rough probability | What it looks like |
|---|---|---|
| Stop at week 8 (thresholds missed) | ~60–70% | Loss of ~£3–4k of time + ~£300 cash; reusable pipeline; learned distribution facts |
| Modest side project | ~20–25% | 1–3k MAU, ~£100–350/month; keep as a hobby/portfolio piece |
| Real small business | ~10–15% | 8–16k MAU within ~12 months, ~£1k/month (gross to net depending on levers) |
| Upside | <5% | Audience big enough for sponsorship/retailer deals; acquihire-type lottery (Moltbook is not a template) |

- **Revision note:** my earlier review gave the capped *broadcast* v2 a ~15–20% chance of reaching £1k/month. The interactive chat version has thinner margins (§7.4), so treat ~10–15% as the honest odds for £1k gross and lower for £1k net.
- **Option value:** the pipeline, the personas, the cadre and (if consented) first-party question data all carry over to a B2B pivot; that is the real return if the consumer numbers disappoint.

---

## 8. Monetisation — how it works

**One line:** Free: public debate + a few private chats. Paid (~£4, test £6–8 and annual): more chat, ask-both, deal/price alerts. Affiliate: commission on Reverb purchases from our links. Later: sponsorship and B2B insight.

1. **Affiliate (first revenue).** User clicks a deal or item link → `/api/out` logs the click and redirects to Reverb via an Awin deep link with a `clickref` (bot + episode, no PII) → Awin sets a 30-day cookie → if the user buys on Reverb, Awin attributes the sale, commission (listed 5% + $5 new buyer, minus returns/tax/shipping) is approved after the return window and paid above a minimum threshold. Requires Awin approval, a live public site, disclosure everywhere, and (likely) Vercel Pro. **Ranking rule:** rank deals by fit to the user's rig and budget, never by commission; say so in the terms.
2. **Subscription (second).** Stripe Payment Link/Checkout, monthly or annual. Pre-sell before building billing: a link that records intent (event `presale_clicked`). Paid tier: higher daily cap, ask-both, saved-want price alerts by email, longer memory. Nothing free is taken away except headroom.
3. **Sponsorship (later).** Brands/retailers pay for a clearly labelled slot in the public episode or a "Hank tries…" segment. Needs an audience; must be labelled as an ad; bots must not be forced to praise.
4. **B2B insight (later, gated).** Aggregated, anonymised, consented data on what guitarists ask about brands/products ("what our cadre asked about your launch this week"). This is the credible substitute for the Reddit data the earlier B2B idea lacked. Retailer white-label rig-aware assistant using their stock feed is the other route.

**Compliance:** affiliate links must be clearly disclosed (UK advertising rules, and US FTC guidance for US users). Bots must not present sponsored content as opinion.

---

## 9. Competition and moat

- **Generic assistants** (ChatGPT/Claude with memory + scheduled tasks): can already "read my rig and recommend". Our edge is curation, live used-market matching, personality/entertainment, community, and affiliate-linked action. **Weakest part:** a determined user can replicate the utility.
- **Free human content** (YouTube reviewers, forums, Reddit, Andertons-style retailer content): abundant. Our angle is the *structured disagreement plus sources*, and the personalised layer.
- **Marketplaces** (Reverb): own saved-search alerts and a free Price Guide. Our angle is taste/rig-aware filtering and commentary, not the raw listings.
- **News feeds/aggregators** (Feedly etc.): commodity; we add voice and opinion.
- **Companion/persona apps:** AI consumer apps have higher payer revenue but faster churn (§5). Novelty decays; utility (deals, rig fit) has to hold retention.
- **B2B competitors** (parked path): see §4.

---

## 10. SWOT and scorecard (from the independent review)

### Guitarbot (consumer)
- **Strengths:** founder conviction and marketing edge; domain credibility, Rigistry schema and Next.js/Neon stack; low run cost; audience signal in weeks; three revenue streams.
- **Weaknesses:** digest is commodity; novelty decays and AI apps churn faster; ~£0.08 revenue per free user; persona appeal unproven; no owned audience yet.
- **Opportunities:** big gear baskets for affiliate; rig-aware paid tier on Rigistry data; audience as an asset for brand/retailer deals; large communities to seed from.
- **Threats:** guitar communities may reject AI content (untested); copyright/terms when summarising publishers; big platforms shipping free digests; Online Safety Act exposure if sharing/user-made bots are added; affiliate terms change.

### B2B market intelligence (music trade)
- **Strengths:** clear buyer/price; reuses schema and pipeline; single-launch report is a ~2-week build; retail contacts.
- **Weaknesses:** founder lacks conviction; thin moat; messy data access (Reddit contract, forum terms, Reverb sold prices unofficial); sales-led.
- **Opportunities:** bespoke launch reports first; retailer personalised recommendations after a pilot; Reddit-free version (Reverb + YouTube + retailer reviews).
- **Threats:** small market; unproven willingness to pay; GDPR on attributed forum content; substitutes (enterprise listening tools, deep-research chatbots).

### Weighted scorecard (1–5, higher = better; competition and legal rows inverted)

| Criterion | Weight | Bot as planned | Bot v2 (broadcast) | B2B intel | B2B committee |
|---|---|---|---|---|---|
| Cash cost to launch/run | 10 | 3 | 5 | 3 | 4 |
| Build ease (solo) | 12 | 3 | 4 | 3 | 2 |
| Speed to demand evidence | 12 | 3 | 4 | 3 | 2 |
| Monetisation clarity | 12 | 2 | 3 | 3 | 4 |
| Competition (5 = uncrowded) | 8 | 2 | 2 | 4 | 1 |
| Distribution ease | 12 | 2 | 3 | 3 | 1 |
| Founder fit/conviction | 12 | 4 | 4 | 2 | 2 |
| Realistic upside | 8 | 2 | 2 | 3 | 3 |
| Cost of being wrong (5 = cheap) | 4 | 4 | 5 | 4 | 3 |
| Legal/data risk (5 = low) | 10 | 3 | 4 | 2 | 2 |
| **Weighted total** | 100 | **2.76** | **3.58** | **2.90** | **2.36** |
| **Ignoring founder fit** | | 2.59 | 3.52 | 3.02 | 2.41 |

Scores are judgement. **Caveat:** "Bot v2" was scored as the *broadcast* design. The interactive v2.5 loses some points on cash cost and legal risk (per-message cost, chat exposure) and gains on founder fit and differentiation; it would likely still rank above B2B intel but by less.

---

## 11. Guardrails

### Technical / cost
- Console spend limit on the Anthropic key; global daily spend cap in code ($8 default); per-run cap ($2); per-user daily message cap and monthly budget; max input 500 chars; max output 350 tokens; cohort-specific caps (cadre generous, public 3/day).
- All LLM calls via one wrapper that logs tokens/cost and enforces caps.
- Batch pipeline: an expensive stage failing must not delete or replace the last good published episode.

### Prompt-injection and content integrity
- All fetched content and user text is untrusted data, sanitised, wrapped in `<context>`/`<item>` tags with an explicit "data, not instructions" rule.
- No tools for any LLM; no web access from chat; digest step cannot fetch URLs.
- Model never emits URLs; only server-rendered tokens for IDs present in that request's context; allowlisted redirect (`reverb.com` and stored source hosts) to prevent open-redirect abuse.
- Red-team suite must pass before launch (`02`, M4).

### Legal / regulatory
- **UK Online Safety Act:** extraterritorial where UK users are significant. Design keeps exposure low (private chat, no sharing/comments/user-made bots, no live search). Residual uncertainty about whether a cached-answer chatbot counts as a search service or a user-to-user service. **Get a short legal check before stranger-facing wave 2.**
- **UK GDPR:** chat messages and rigs are personal data. Collect consent at signup, retain messages 90 days, provide deletion, no sale of data, no analytics cookies (first-party events only), privacy notice. **VERIFY** whether the ICO data-protection fee applies. Do not store attributed forum content (another reason Reddit/Gear Page are out).
- **Copyright/ToS:** store title, URL, ≤500-char snippet and our own summary; link out; never republish full text. Check each publisher's feed terms; label brand-PR sources (e.g. Gibson Gazette) as brand voice.
- **Advertising/affiliate:** clear disclosure on every page with out-links; ranking not driven by commission.
- **Age:** 18+ tickbox is weak assurance; do not target minors; end conversations if a user states they are under 18.
- **Likeness/defamation:** fictional archetypes only; criticise products, never individuals; facts only from cited items; opinions labelled.

### Content policy for personas
- Decline medical, legal, financial, self-harm (with a pointer to real help), personal-data and impersonation requests, briefly and in character.
- If context has nothing, say so. Never invent news, prices or availability.

---

## 12. Distribution and scaling from zero

1. **Seed (weeks 1–4):** the ~100 cadre via personal messages, with a specific ask (add 3 pieces of gear, try 5 questions, take a 2-minute survey). Do 5 screen-share sessions of 20 minutes.
2. **Public read-only debate pages** are the shareable unit (OG image later): the safe version of the Moltbook "watch the bots argue" loop.
3. **Wave 2 (weeks 5–8):** 100–300 strangers by hand-posting a genuine sample episode in two communities (r/guitarpedals ~325k, r/Guitar ~3.3M, gear Discords, forums), obeying self-promotion rules; DM a handful of small YouTube gear creators; use the founder's retail contacts. Guitar communities may resent AI content — test that with a hand-curated sample before scaling. SEO from AI-generated pages is risky; don't rely on it **[judgement]**.
4. **Return triggers:** a daily "today's episode" email (Resend, Stage 3), then a Discord bot on the same chat endpoint.
5. **Referral:** "Ask Hank about X" deep links from episode pages; invite codes for the cadre to share.

---

## 13. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Novelty decays; retention low | High | High | Utility hooks (deals, rig fit); measure D7/W4; kill rules |
| Free chat costs exceed revenue per user | Medium | High | Two cap cohorts; monthly per-user budget; global kill switch |
| Prompt injection via feeds/listings | Medium | Medium | Untrusted-data policy, no tools, token-rendered links, red-team suite |
| Hallucinated news/prices damage trust | Medium | High | Facts only from context; source tokens; "haven't seen it" fallback; daily review queue |
| Online Safety Act / GDPR problem | Low–Med | High | Private 1:1, no sharing, deletion, retention, legal check before wave 2 |
| Affiliate not approved, rate lower, UK-ineligible | Medium | Medium | Verify early (apply at end of M2); alternatives (Thomann/Sweetwater/creator programme); subscription as backup |
| Feed URLs change/break | High | Low | `check:feeds`, per-source status, multiple sources |
| Reverb API terms/limits change | Medium | Medium | Read terms in M0; low request volume; deals are optional |
| Community rejects AI content | Medium | Medium | Hand-curated sample test before scaling; transparent labelling |
| Founder drift/scope creep | High | High | Stage gates, `BACKLOG.md`, kill rules |
| Friendly cadre inflates metrics | High | Medium | Discount 50%; rely on wave-2 strangers for real signal |
| Ops burden (pipelines break, reviews) | Medium | Medium | Alerts on failure; 10-min daily routine; budget 5–8 h/week |
| Publisher complaints about summaries | Low | Medium | Snippet+summary+link only; respond quickly; drop a source if asked |

---

## 14. Stage 3 — testing, thresholds, kill rules

### 14.1 Cadre test (four weeks after M4)
Cadre thresholds are my judgement; the cadre is friendly, so they are already discounted.

| Metric | Target |
|---|---|
| Activation: chat or rig within 3 days of signup | ≥60 of 100 |
| Weekly actives at week 4 | ≥30 |
| Chats per active user per week | ≥3 |
| Rig completion (≥3 items) | ≥50% of signups |
| Deal-link click rate (of weekly actives) | tracked; ≥5% good |
| "Very disappointed" if it disappeared (users active ≥2 weeks) | ≥40% (standard product-market-fit heuristic) |
| Pre-sell: commit to £4/month | ≥10 |
| Cost per active user per month | <£0.50 (target ≤£0.15 for the public cohort) |

Also run 5 × 20-minute screen-share sessions: watch what they actually ask, what they ignore, and what they would use instead. The real value proposition is whatever they repeatedly do.

### 14.2 Wave 2 (weeks 5–8, strangers)
- Reduce caps to the `public` cohort first. Add email capture on public episode pages and a daily episode email.
- Targets (judgement): ≥3% of unique visitors from a community post sign up; ≥20% of strangers active at day 7; cost per active user ≤£0.15.

### 14.3 Decision rules (fixed in advance)
- **Cadre thresholds missed AND interviews reveal no specific use worth building around** → stop the consumer product at week 8. Reuse the pipeline for a single-launch B2B report (music-trade intelligence) as the fallback.
- **Cadre thresholds met but wave 2 fails** → keep as a low-effort personal project; do not scale spend.
- **Both pass** → switch on affiliate (after Vercel Pro), open the £4 tier (test £6–8/annual), invest in growth, and start collecting consented aggregate data.

### 14.4 B2B gates
- Only consider B2B when there are ≥1,000 engaged users **or** the cadre logs show repeatable brand-level questions.
- Options, in order: (1) weekly "what guitarists asked about your brand" report from consented aggregated logs; (2) retailer white-label rig-aware assistant with their stock feed (pitched to existing retail contacts with real usage numbers).
- Optional cheap side-experiment (unchanged from the handoff): the synthetic-buying-committee backtest, only if a sales team provides 5–10 real closed-lost deals with documented reasons; blind-score committee sim vs a generic "likely objections" prompt vs the rep's own guess; kill if the sim is not clearly better. Cost <£30, about a week; only run it if the founder wants a parallel bet.

---

## 15. To-dos, open questions, assumptions to verify

### Founder to-dos
- [ ] Supply: YouTube channel list; Anthropic key with spend limit; Neon `DATABASE_URL`; GitHub repo; contact email; domain; persona names/voice tweaks.
- [ ] Confirm cadre list, UK share, and how they will be invited.
- [ ] Apply to Reverb via Awin at the end of M2; check UK eligibility and real rate.
- [ ] Decide when to move hosting to Vercel Pro (before affiliate/payments).
- [ ] Get a quote for a short legal check before wave 2.
- [ ] Decide on price test (£4 vs £6–8 vs annual) and set up a pre-sell link (needs approval before adding any payment dependency).
- [ ] Decide whether to run the optional B2B backtest.
- [ ] Review 30+ real transcripts before launch; do the 10-minute daily review after.

### Agent to-dos
Follow `01` and `02` in order. Keep `PROGRESS.md` and `BACKLOG.md`. Record actual hours and spend per milestone.

### Open questions
1. What is the cadre's real relationship and UK share? (bias and regulation)
2. Are Hank and Vee funny enough to carry entertainment value? (M1 rubric)
3. Do users actually want to chat, or just read the debate? (events data)
4. Does the rig-aware layer feel meaningfully better than ChatGPT with memory? (interviews)
5. Is 5% Reverb commission real and UK-available? (Awin)
6. Which company/legal entity, and tax treatment, will receive revenue? (not covered)

### Assumptions to verify (before trusting any number here)
- Anthropic model IDs, Sonnet pricing, cache multipliers.
- Reverb API terms, rate limits, currency handling, real field names.
- Feed URLs (from directories, not publishers), including Premier Guitar's.
- Awin: Reverb programme regions, commission, payout threshold, deep-link format.
- Stripe UK fees (1.5% + 20p from memory).
- Online Safety Act position on cached-answer chatbots; ICO fee applicability.
- Moltbook details, competitor funding/pricing, ChatGPT scheduled-tasks limits (weak sources).

---

# Appendix A — Summary of `guitarbot-strategy-review.md` (the handoff)

**Original plan:** consumer platform of persona bots (e.g. "grumpy luthier") posting scheduled guitar-gear digests; free + £3–5/month; Moltbook-inspired; cheap PoC to pivot to B2B/creator tools; capped costs (~£0.16/user/month break-even at 4% conversion), scheduled runs, token caps, shared research cache.

**Round-1 critique:** unit economics fragile (realistic conversion 1–3%; EV case ~£30k inconsistent with break-even numbers; unconstrained chat can spike token cost ~10×); PoC-for-B2B logic circular; growth vs cost-cap tension (Moltbook's virality came from unconstrained activity); 800–1,000 hours valued at zero; product thin vs ChatGPT scheduled tasks/Perplexity/Feedly; legal (prompt injection, likeness → generic archetypes, weak 18+ gating, possible UK Online Safety Act exposure if conversations are shareable); distribution unproven ("thousands" of reach → low hundreds of signups).

**Synthetic Buying Committees:** AI CFO/CISO/end-user pressure-testing a rep's pitch → "Deal Vulnerability Digest". Fermi economics from the source doc (unverified): £250–£22,500/month, risk-weighted annual EV ~£15–35k, £15–43/hr vs £0.50–5.60/hr consumer. Critique: crowded (Hyperbound, Outdoo, Second Nature $22M Oct 2025), enterprise buyers expect SOC 2/GDPR/SSO/LMS, wedge is narrower (account-specific pre-meeting red-teaming), persona drift, GIGO, confidential-data risk, optimistic pilots-vs-MRR assumptions. Backtest: 5–10 closed-lost deals, freeze pre-meeting inputs, three blind conditions (committee sim / generic objections prompt / rep's guess), score recall/precision, kill if sim isn't clearly better; also code each loss as "fixable by pre-briefing" or not.

**Other pivots:** (a) generic professional digest — rejected; (b) guitar niche "high disagreement, high spend" — true but free human disagreement is abundant; reframed to individualised pre-purchase decision support; (c) B2B2C retailer newsletters — a voice skin adds nothing; only the purchase-history-driven individualised version has value, test vs their existing newsletter over ~6 weeks; (d) individualised recommendation — generic chatbots can already do it, so moat = persistent taste memory + live stock/pricing + niche used-market data + editorial trust; (e) niche B2B market intelligence; (f) legal hostile-briefing tool — parked (competitors exist; UK witness coaching vs familiarisation; local-model hardware and persona drift).

**Market intelligence deep dive:** sell sentiment/modding/used-market intelligence to mid-size instrument brands, boutique pedal builders, luthiers, specialist retailers; priced between $99–299/mo e-commerce tools and $800–3,000+/mo enterprise platforms; claimed reuse of Rigistry ontology, SongDeck stack, McGee agent architecture (a claim to verify, not a given saving). The source research doc had internal pricing inconsistencies. Moat critique: domain knowledge is largely inside general LLMs; cheap models fine for tagging but likely weak for synthesis; real moat = curated sources and editorial judgement. Data access: Reddit ~$12k/yr minimum (**now [conflict]**), Gear Page terms unconfirmed, YouTube transcripts grey, Reverb usable (**refined: live listings yes, sold history no**), UK GDPR risk in storing attributed forum content. TAM thin; Marshall/Thomann wrong first targets (better: 10–50-staff brands with a marketing lead). 2-week MVP: single-launch report from Reverb pricing + YouTube transcripts (transcripts now dropped for ToS reasons), blind-checked by 2–3 knowledgeable people, then used as cold-outreach asset to 10–15 mid/small brands.

**Founder pushback:** prefers the consumer bot: believes they can market it better; lacks domain conviction in brand intelligence; the market-intel pitch sounded thin. Handoff's five open questions: re-evaluate the consumer bot on its own terms; a version that fixes economics/virality/differentiation; run the B2B backtest in parallel?; how to combine EV and conviction; shelve or narrow market intelligence.

**How this doc set answers them:** (1) yes, via v2.5; (2) capped, cached, private-chat design with two cohorts; (3) optional, only with real data; (4) conviction as tie-breaker (D11); (5) parked, revive with first-party data.

# Appendix B — Summary and assessment of `v2redux.md`

**What it says:**
- My v2 "gutted the soul": a one-way email digest misses the interactive persona and the ability to ask "what's going on with Fender?".
- The pivot away from chat was to solve unpredictable token costs and regulatory/hallucination risk. The Online Safety Act reaches overseas providers with UK users.
- Bring back two-way chat with mechanical guardrails: per-user monthly token limits, small cheap models for banter, private-only bots.
- **Architecture:** (1) backend bot-to-bot debate on a cron (e.g. twice a day) — "grumpy luthier" vs "gear snob" ingest RSS/Reverb and argue; output saved as a global context cache. (2) Frontend chat: user talks to a single bot that queries the cache (no live search) using the established persona. (3) Personalisation layer (the monetisation hook): cross-reference cached news with the user's logged gear (example rig: USA-made PRS Custom 24, Boss Katana-50, Boss TU-2). Heavy token cost is paid once per day, not per session.
- Closing question: does the user pick a persona, or is there a single "lead singer" bot?

**Assessment (adopted, with changes):**
- **Adopted:** cache-then-chat; private 1:1 chat; rig personalisation as the paid hook; extraterritorial OSA point.
- **Tightened:** chat still costs per message, so caps stay and differ by cohort; the bot must admit when its cache lacks an answer; the debate must cite sources or it is theatre; the model never emits URLs.
- **Answer to the closing question:** the user picks Hank or Vee (two tabs); "ask both" is a later paid feature.
- **Not adopted:** "smaller, cheaper models for casual banter" is used for chat (Haiku), but the debate itself uses a stronger model because quality of the daily debate is the product's hook.

# Appendix C — Glossary

- **Cadre:** the ~100 friendly guitarists seeded at launch.
- **Episode:** one published Hank-vs-Vee debate, with sources.
- **Cache-then-chat:** run expensive multi-bot work in batch; chat only reads the cached result.
- **Want key:** normalised "brand model" string used to fetch Reverb deals once per distinct want.
- **MAU:** engaged monthly active user.
- **Awin:** affiliate network running Reverb's programme.
- **Clickref:** tracking tag attached to an Awin link (bot + episode, no PII).
- **Kill rule:** pre-agreed condition under which the consumer product is stopped.

# Appendix D — Key numbers cheat-sheet

- Budget: ~800–1,000 hours, ~£500 cash. MVP: 60–80 h. Decision at week 8 after ~100–120 h.
- Running cost: ~£30–90/month; debate ≈ $0.25–0.70/run; chat ≈ £0.002/message (cached, Haiku).
- Revenue per free user at 2.1% conversion, £4 sub: ~£0.079/month; blended with affiliate ≈ £0.116 per MAU.
- MAU for £1k/month: ~8.6k gross-blended; ~16k net at £4 after chat costs; ~8k net at £7.
- Benchmarks: freemium ~2.1% (AI 2.4%); AI year-1 retention 21% vs 31%.
- Reverb affiliate (Awin, US listing): 5% + $5 new buyer; 30-day cookie; UK eligibility unchecked.
- YouTube Atom feed: latest ~15 uploads, no key. Reverb listings: 50 per page, 2,500 per query cap.
- Vercel Hobby: non-commercial; cron once a day. Pro ~$20/month.
- Caps: cadre 10 msgs/day; public 3/day; global $8/day; pipeline run $2.
