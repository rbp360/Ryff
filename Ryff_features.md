# Ryff Feature Log

## Feature: Marketplace Days-on-Market Tracking, Price Drop History & Regional Geo-Filtering
- **Date:** October 2, 2026
- **Category:** Marketplace Intelligence / Wants Matching / Personalization

### 1. User & Marketing Overview
Ryff now automatically monitors used marketplace listings (e.g. Reverb) with enhanced intelligence:
- **True Days on Market:** Know exactly how long an item has sat unsold on the marketplace (e.g., *"142 days on Reverb"*), so you can negotiate with confidence or gauge demand for obscure gear.
- **Price Drop & Discount Badges:** Highlights price drops directly on deal cards and chat recommendations (e.g., *“£850 · was £950”*), so you never miss a bargain.
- **Custom Search Region & Geo-Filtering:** Set your global buying region preference (e.g., **UK Only**, **Ships to UK**, **US Only**, or **Worldwide**). Ryff filters out gear outside your shipping zone so you only see items you can actually buy.

---

### 2. Technical Details (For Developers)
- **Reverb API Enhancements ([`src/lib/reverb.ts`](file:///c:/Users/rob_b/Ryff/src/lib/reverb.ts)):**
  - Updated `ReverbListing` interface and `parseReverbResponse` to extract `published_at` / `created_at`, `original_price`, `ribbon` price drops, and calculate `daysOnMarket = Math.floor((now - published_at) / 86400000)`.
  - Added `itemRegion` (`&item_region=`) and `shipsTo` (`&ships_to=`) query parameter support to `searchListings()`.
- **Database Schema ([`db/migrations/0009_reverb_location_and_history.sql`](file:///c:/Users/rob_b/Ryff/db/migrations/0009_reverb_location_and_history.sql)):**
  - Table `deals`: Added `published_at` (timestamptz), `original_price_amount` (numeric), `price_drop_text` (text), and `first_seen_at` (timestamptz).
  - Table `users`: Added `reverb_region` (text enum: `'UK_ONLY'`, `'SHIPS_TO_UK'`, `'US_ONLY'`, `'WORLDWIDE'`).
- **Pipeline & Retrieval ([`src/pipeline/deals.ts`](file:///c:/Users/rob_b/Ryff/src/pipeline/deals.ts) & [`src/lib/retrieval.ts`](file:///c:/Users/rob_b/Ryff/src/lib/retrieval.ts)):**
  - `runDealsPipeline` queries distinct want items joined with user `reverb_region` preferences and passes region constraints to Reverb search calls.
  - Upserts `published_at`, `original_price_amount`, and `price_drop_text` into `deals` table on conflict.
- **Sanitisation & Link Formatting ([`src/lib/guard.ts`](file:///c:/Users/rob_b/Ryff/src/lib/guard.ts)):**
  - Updated `[[deal:ID]]` token transformer to output formatted price drop and Days-on-Market badges into Markdown links.
- **Preferences API ([`src/app/api/preferences/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/preferences/route.ts) & [`src/lib/personalization.ts`](file:///c:/Users/rob_b/Ryff/src/lib/personalization.ts)):**
  - Extended user preferences schema and endpoints to read and update `reverbRegion`.

---

### 3. White-Label & Domain-Agnostic Utility
- **Cross-Domain Application:** This feature provides a general-purpose **Third-Party Marketplace Ingestion & Listing Longevity Tracker**.
- **Use Cases for Other Verticals:**
  - 🚗 **Automotive / Used Vehicles:** Track how long a specific car model has sat on AutoTrader/eBay Motors, log price drop history, and limit matches to a specific postal radius or country.
  - 👟 **Sneakers & Collectibles:** Monitor resale platforms (StockX, GOAT) for rare sneakers or watch listings, logging time-on-market and localized shipping capability.
  - 💻 **Consumer Electronics & Appliances:** Monitor refurbished laptops, cameras, or audio gear on Amazon/eBay with localized country filters and automated bargain detection when prices drop.
  - 🏠 **Real Estate / Rentals:** Track property listings for time on market, price history reductions, and geographic filter preference.

---

## Feature: UX Restructure, SongDeck Minimalist Design System & Voice-Enabled Rig Management
- **Date:** October 2, 2026
- **Category:** UX Architecture / SongDeck Design System / Information Architecture / Audio Logging

### 1. User & Marketing Overview
Ryff has been completely restructured into an uncluttered, high-contrast, mobile-first web application following the **SongDeck Design System**:
- **Pure Minimalist Aesthetic:** Deep black canvas (`#000`), subtle cards (`#121212`), hairline dividers (`#242424`), and high-impact SongDeck green (`#22c55e`) for active states and CTAs, paired with geometric typography (Montserrat / Lemon Milk).
- **Persistent 5-Tab Navigation:** Unbroken app shell featuring **Home**, **Digest**, **Backstage**, **Trader**, and **Rig room**, with frosted glass backdrop blur.
- **Home Morning Briefing:** Displays real background pipeline activity (*"Checked 47 sources · 81 new stories · 3 about your gear"*), Hank's takeaway card, overdue string alerts (*"Needs attention"*), and 4 quick Explore tiles.
- **Dedicated Digest Screen:** Elevated "Today's Gear Radar" to its own dedicated view with topic clustering, 16:9 thumbnails, `Matches: <gear>` tags, and bot editorial takes.
- **1-on-1 Backstage Bot Arena:** Direct 1-v-1 conversational interface toggling between **Hank** (vintage luthier) and **Vee** (modern modeller), with daily quota tracking and sticky debate bar.
- **Trader Deals Hub:** Dedicated used gear marketplace matching user's tracked wants to Reverb listings with price-drop indicators and days-on-market metrics.
- **3-Segment Rig Room & Quick-Mic Voice Logging:** Segments for **Gear**, **Log**, and **Wants**. Includes a 1-tap `🎙️` microphone button for instant 15-second voice memos that automatically parse gear additions, maintenance, setups, and parts swaps into the spec sheet.
- **Gear Detail Screen:** 4:3 hero photo, live string age health status, multimodal voice memo logger, hardware spec breakdown, and maintenance history timeline.
- **Setup & Account Hub:** Customizes bot personality (Dry / Blunt / Chatty), followed brands/players, active feed sources, Reverb shipping region, and clean account management.

---

### 2. Technical Details (For Developers)
- **Token Design Architecture ([`src/app/tokens.css`](file:///c:/Users/rob_b/Ryff/src/app/tokens.css) & [`src/app/ryff.css`](file:///c:/Users/rob_b/Ryff/src/app/ryff.css)):**
  - Standardized CSS custom properties (`--bg`, `--sf`, `--ln`, `--tx`, `--mu`, `--ac`, `--ac2`, `--r`, `--font-display`, `--font-body`).
  - Full-screen responsive viewport layout (`#stage` / `#app`) eliminating artificial desktop mobile containers and centering content in an uncluttered `max-width: 760px` reading column.
  - Pinned frosted glass navigation ([`src/app/(app)/AppNav.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/AppNav.tsx)) utilizing Next.js App Router route detection (`usePathname`).
- **Next.js App Router Structure:**
  - Layout: [`src/app/(app)/layout.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/layout.tsx) providing persistent navigation across all consumer routes.
  - Home: [`src/app/(app)/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/page.tsx) server component aggregating parallel database metrics (`sources`, `items`, `episodes`, `rig_items`, `deals`).
  - Digest: [`src/app/(app)/digest/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/digest/page.tsx) & [`DigestFeed.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/digest/DigestFeed.tsx) with client-side category and rig-affinity filtering.
  - Backstage: [`src/app/(app)/backstage/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/backstage/page.tsx) interactive 1-v-1 chat interface connected to `/api/chat`.
  - Trader: [`src/app/(app)/trader/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/trader/page.tsx) connecting tracked wants to Reverb `deals` table with days-on-market calculations.
  - Rig Room: [`src/app/(app)/rig/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/rig/page.tsx) & [`RigRoomClient.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/rig/RigRoomClient.tsx) with multi-segment state and quick-mic audio capture.
  - Item Detail: [`src/app/(app)/rig/[id]/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/rig/[id]/page.tsx) multimodal audio recording (`MediaRecorder` -> base64 -> Gemini Flash) with instant spec sheet updates.
  - Setup: [`src/app/(app)/setup/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/setup/page.tsx) & [`SetupClient.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/setup/SetupClient.tsx) syncing with `/api/preferences`.
- **API Enhancements ([`src/app/api/rig/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/rig/route.ts)):**
  - Updated `GET /api/rig` to join `rig_item_logs` with `rig_items`, returning complete rig history in a single round-trip.
- **Documentation:**
  - Created [`AUDIT.md`](file:///c:/Users/rob_b/Ryff/AUDIT.md), [`PLAN.md`](file:///c:/Users/rob_b/Ryff/PLAN.md), [`GAPS.md`](file:///c:/Users/rob_b/Ryff/GAPS.md), and [`HERO_PLAN.md`](file:///c:/Users/rob_b/Ryff/HERO_PLAN.md).

---

### 3. White-Label & Domain-Agnostic Utility
- **Cross-Domain Application:** This feature provides a complete **Vertical AI Assistant & Inventory Maintenance Shell**.
- **Use Cases for Other Verticals:**
  - 🏎️ **Classic Cars & Motorsport:** Garage inventory tracking (mileage, oil changes, tire wear, mods), morning industry racing/parts digest, AI mechanic bot debates, and classified deal monitoring.
  - ⌚ **Luxury Watches & Horology:** Collection tracking (service dates, accuracy testing, strap changes), auction news feed, bot debate on vintage vs. independent watchmakers, and marketplace price drop monitoring.
  - 🚴 **Bicycles & Cycling Gear:** Bike fleet management (chain wear, tubeless sealant top-up, component upgrades), cycling news radar, and used component tracker.

---

## Feature: Public Marketing Landing Page (`/welcome`) & Value Proposition Showcase
- **Date:** October 2, 2026
- **Category:** Marketing & Conversion / Public Landing Page / SongDeck Brand Positioning

### 1. User & Marketing Overview
Ryff now includes a dedicated public-facing marketing landing page at [`/welcome`](http://localhost:3000/welcome) designed to convert visitors in under 10 seconds:
- **Hero Narrative:** Led by the high-impact headline *"YOUR RIG. YOUR NEWS. A BOT WITH AN OPINION."* and positioning copy explaining how Ryff ingests 40+ premier guitar feeds and filters them to owned/wanted gear.
- **Background Pipeline Made Visible:** Live interactive card showcasing the automated pipeline in action (*"Checked 47 sources · 81 new stories · 3 about your gear"*) paired with Hank's daily editorial takeaway.
- **3-Step "How It Works" Breakdown:**
  1. *Log Your Rig in 2 Taps:* Voice memo maintenance logging (`🎙️`), string age alerts, and spec sheets.
  2. *Smart Radar Reads the World:* Topic clustering and `<span class="why">Matches: [Your Gear]</span>` tags across 40+ feeds.
  3. *Hank & Vee Clash in Backstage:* 1-on-1 bot debates on tone, tube vs. digital hype, and gear value.
- **Marketplace Intelligence Highlight:** Dedicated showcase for Reverb days-on-market tracking, price-drop alerts, and geo-filtered shipping.
- **Clear Conversion Paths:** Primary calls to action (*"Get Started Free"*, *"Browse Today's Radar"*, *"Sign In"*).

---

### 2. Technical Details (For Developers)
- **Static Route Implementation ([`src/app/welcome/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/welcome/page.tsx)):**
  - Fully static prerendered page (`○ /welcome`) with zero server round-trip latency.
  - Sticky glass header with `backdrop-filter: blur(16px)` and SongDeck logo.
  - Token-driven layout using `--font-display`, `--ac`, `--ac2`, `--sf`, and `--ln`.
  - Linked seamlessly to the in-app footer and login flows.
- **Integration:**
  - Added "About Ryff" navigation link in the in-app Home footer ([`src/app/(app)/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/page.tsx)).

---

### 3. White-Label & Domain-Agnostic Utility
- **Cross-Domain Application:** General-purpose **High-Converting Landing Page Architecture** for any vertical AI assistant.
- **Use Cases for Other Verticals:**
  - 🏎️ **Automotive / Performance Cars:** Landing page featuring live track telemetry ingest, garage maintenance logs, and classic car auction tracking.
  - ⌚ **Luxury Watches:** Collection maintenance timeline, auction house news clustering, and grey-market price drop alerts.
  - 🏡 **Real Estate / Rentals:** Automated neighborhood market scanner, renovation log tracking, and property value negotiation bot.

