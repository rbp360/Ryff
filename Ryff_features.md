# Ryff Feature Log

## Feature: Verified Feed Health Diagnostics & Canonical YouTube Channel Resolution
- **Date:** October 3, 2026
- **Category:** Ingestion Pipeline / Feed Health / Admin Intelligence

### 1. User & Marketing Overview
- **Canonical YouTube Channel Resolution:** Automated auditing and auto-healing of YouTube RSS feed sources, ensuring all monitored creator channels (e.g. Rick Beato, Spectre Sound Studios, JHS Pedals, The Trogly's Guitar Show, 60 Cycle Hum, Guitar World) resolve to their true canonical channel IDs (`UC...`) so video updates are reliably ingested without HTTP 404 or 500 errors.
- **De-Duplicated Feed Diagnostics:** The Ryff Admin Command Centre feed health dashboard now filters strictly by active feed sources, eliminating ghost/duplicate historical rows (such as old inactive channel URL iterations) so administrators have a crisp, accurate view of current feed health.

---

### 2. Technical Details (For Developers)
- **Config & Channel Verification ([`config/sources.json`](file:///c:/Users/rob_b/Ryff/config/sources.json)):**
  - Audited all YouTube sources against YouTube's public handle pages to extract canonical `channelId` meta tags.
  - Updated `channel_id` for Rick Beato (`UCcp-HjtmTMeIJ-0RrSHSGLA`), Spectre Sound Studios (`UCfWdGyZaZODBPQc9Lu0y6aw`), The Trogly's Guitar Show (`UCix8J4YIPRpu7i29k7sgirw`), JHS Pedals (`UCTN1OwPMtjgH3hQAxvF-l2Q`), 60 Cycle Hum (`UCKS5rKlMVed10QeByfHLF1g`), and Guitar World YT (`UCaP1TKiIr83uqMV5LwrOY3g`).
- **Source Seeding & Deactivation ([`scripts/seed-sources.ts`](file:///c:/Users/rob_b/Ryff/scripts/seed-sources.ts)):**
  - Executed `seed-sources.ts` to insert updated URLs and deactivate stale/duplicate historical feed records in the PostgreSQL `sources` table.
- **Admin Command Centre Filtering ([`src/app/admin/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/admin/page.tsx)):**
  - Updated SQL query in `getAdminData()` to include `WHERE active = true`, ensuring deactivated or old duplicate sources are not rendered in the admin dashboard table.

---

### 3. White-Label & Domain-Agnostic Utility
- **Cross-Domain Application:** This feature provides an **Automated Source Health Audit & Handle-to-RSS Resolver Engine**.
- **Use Cases for Other Verticals:**
  - 🎥 **Video & Creator Intelligence:** Automatically resolve social media handles across YouTube, Twitch, and Rumble to their canonical RSS/API stream endpoints for tracking creator announcements in any niche (automotive, tech, fitness).
  - 🛠️ **System Health Dashboards:** Clean separation of active vs. historical inactive source records in admin telemetry views.

---


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

---

## Feature: Dedicated Setup UI for Favorite Artists & Followed Brands Tracking
- **Date:** October 3, 2026
- **Category:** News Personalization / Entity Tracking / Preference Management

### 1. User & Marketing Overview
Users can now easily manage and edit their favorite musicians, guitarists, and brands directly within the **Setup Hub** (`/setup`) and view active tracking badges on the **Digest** screen:
- **Favorite Artists & Guitarists Input:** Dedicated card in Setup allowing users to type and add any artist/player (e.g. *Chris Impellitteri*, *Nita Strauss*, *Slash*) or remove existing ones with 1-tap `✕` chips.
- **Custom Brands & Topics Manager:** Flexible topic manager combining preset popular brands (*Marshall*, *Fender*, *Gibson*, etc.) with a custom text entry for niche builders or technologies (*Soldano*, *KSR*, *Modelling*).
- **Digest Active Tracking Banner:** Real-time indicator bar on the **Digest** screen ("For Your Rig & Tastes") displaying all currently tracked artists and followed brands with a direct link to edit them in Setup (`⚙`).

---

### 2. Technical Details (For Developers)
- **Setup Component ([`src/app/(app)/setup/SetupClient.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/setup/SetupClient.tsx)):**
  - Integrated `favoritePlayers` state alongside `followedBrands` and initialized from `initialPreferences`.
  - Created text input controls with `onKeyDown` Enter listeners for instant addition.
  - Updated `syncPreferences()` to send both `favoritePlayers` and `followedBrands` arrays to `/api/preferences`.
- **Digest Integration ([`src/app/(app)/digest/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/digest/page.tsx) & [`DigestFeed.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/digest/DigestFeed.tsx)):**
  - Added parallel `getUserPreferences(userId)` call to `DigestPage` and passed `initialPreferences` down to `DigestFeed`.
  - Added sticky "Tracking: <Artists> <#Brands>" banner to the personalized Digest view.

---

### 3. White-Label & Domain-Agnostic Utility
- **Cross-Domain Application:** Generic **Entity Interest & Keyword Subscription Engine**.
- **Use Cases for Other Verticals:**
  - 🏎️ **Automotive:** Track specific race drivers, car designers (e.g., Gordon Murray, Adrian Newey), or niche tuner brands in the news feed.
  - ⌚ **Luxury Watches:** Track independent watchmakers (e.g., Philippe Dufour, F.P. Journe) or specific complications (e.g., Tourbillon, Perpetual Calendar).
  - 🏃 **Athletics & Running:** Track specific marathon runners, shoe technologies (e.g., Pebax foam, Carbon plates), or brand lines.

---

## Feature: Reverb Marketplace Watchlist & Saved Deals System
- **Date:** October 3, 2026
- **Category:** Marketplace Intelligence / User Personalization / Saved Items

### 1. User & Marketing Overview
Users can now bookmark, track, and manage their favorite used gear listings in a dedicated **Watchlist (`★`)** on the **Trader** hub:
- **Interactive Star Toggling:** Save or un-save any deal listing with 1 tap (`★` / `☆`) directly from deal cards.
- **Trader Tabbed View:** Seamlessly toggle between **Live Deals** and **Saved Watchlist** tab to monitor price drops and listing availability.
- **Listing Thumbnail Previews:** Enhanced visual cards featuring listing photos (`image_url`), price, condition, original price drop badges, and days on market.
- **Persistent User State:** Watchlist state persists across sessions and syncs across devices.

---

### 2. Technical Details (For Developers)
- **Database Schema ([`db/migrations/0011_deals_image_and_watchlist.sql`](file:///c:/Users/rob_b/Ryff/db/migrations/0011_deals_image_and_watchlist.sql)):**
  - Added `image_url` text column to `deals` table.
  - Created `watchlist` table with `id` (bigserial primary key), `user_id` (uuid references users), `deal_id` (bigint references deals), `listing_id` (text not null), `created_at` (timestamptz), and unique constraint `(user_id, listing_id)`.
- **API Endpoint ([`src/app/api/watchlist/route.ts`](file:///c:/Users/rob_b/Ryff/src/app/api/watchlist/route.ts)):**
  - `GET /api/watchlist`: Returns array of `watchlistListingIds` for the authenticated user session.
  - `POST /api/watchlist`: Toggles item inclusion in `watchlist` (adds if absent, removes if present) with optimistic client state support.
- **Reverb Parser ([`src/lib/reverb.ts`](file:///c:/Users/rob_b/Ryff/src/lib/reverb.ts)):**
  - Updated `ReverbListing` schema and `parseReverbResponse` to extract listing thumbnail images (`photos[0]._links.thumbnail.href`).
- **Trader Hub UI ([`src/app/(app)/trader/TraderClient.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/trader/TraderClient.tsx)):**
  - Added tab bar state (`'all'` vs `'watchlist'`), visual listing cards with fallback badges, and interactive star toggle button.

---

### 3. White-Label & Domain-Agnostic Utility
- **Cross-Domain Application:** General-purpose **Saved Listings & Inventory Watchlist Module**.
- **Use Cases for Other Verticals:**
  - ⌚ **Luxury Watches:** Track targeted listings across Chrono24 / eBay with price drop notifications.
  - 🏎️ **Classic Cars:** Bookmark target auctions on Bring a Trailer or AutoTrader and track price reductions.
  - 👟 **Footwear & Collectibles:** Save target shoe listings on StockX or GOAT and monitor price changes over time.

---

## Feature: Universal Sub-Page Back Navigation & Sticky Header System
- **Date:** October 3, 2026
- **Category:** Navigation Architecture / UX Depth / Mobile-First UX

### 1. User & Marketing Overview
Ryff's navigation depth has been enhanced with a universal top navigation bar featuring explicit back buttons (`← Back`) across detail views and setup screens:
- **Intuitive Touch Target Back Navigation:** Users can effortlessly return to parent views (e.g. back to Rig Room from a specific gear detail sheet, or back to Home from Setup) without relying on browser navigation buttons.
- **Sticky Glass Backdrop Header:** Low-contrast hairline border with frosted glass blur, preserving screen real estate while remaining accessible at all scroll positions.

---

### 2. Technical Details (For Developers)
- **UI Header Integration ([`src/app/(app)/rig/[id]/page.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/rig/[id]/page.tsx), [`src/app/(app)/setup/SetupClient.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/setup/SetupClient.tsx)):**
  - Implemented client header bar utilizing Next.js `useRouter().back()` with fallback fallback navigation paths (`/rig` or `/`).
  - Added CSS classes `.back-btn` with high touch padding (12px 16px) and SongDeck token styling (`--sf`, `--ln`, `--tx`).

---

### 3. White-Label & Domain-Agnostic Utility
- **Cross-Domain Application:** Mobile-First **Nested Route Navigation Template**.
- **Use Cases for Other Verticals:** Any multi-level vertical mobile application requiring clean drill-down state preservation (e.g., viewing shoe wear metrics -> fleet list, viewing politician statement -> timeline).

---

## Feature: Rigistry Gear Catalog Auto-Matching Engine & Canonical Brand Aliasing
- **Date:** October 3, 2026
- **Category:** Data Normalization / Catalog Alignment / Multimodal Auto-Categorization

### 1. User & Marketing Overview
Ryff's gear catalog matching engine now automatically resolves brand nicknames, typos, and common aliases into canonical database records:
- **Intelligent Brand Alias Resolution:** Commands like *"Added a Soldano SLO100 head"* or *"Tubescreamer pedal"* automatically resolve to canonical brand records (*Soldano Custom Amplification*, *Ibanez*) and proper category classification (`amplifiers-effects`).
- **Seamless Voice & Text Logging:** Users can speak naturally into the quick-mic logger without needing exact catalog spelling.

---

### 2. Technical Details (For Developers)
- **Database Schema ([`db/migrations/0010_rigistry_enhancements.sql`](file:///c:/Users/rob_b/Ryff/db/migrations/0010_rigistry_enhancements.sql)):**
  - Updated `brands` and `brand_aliases` tables to include canonical aliases (`soldano`, `charvel`, `tubescreamer`) and default category mappings (`amplifiers-effects`).
- **Parsing Engine ([`src/lib/rigistry-parser.ts`](file:///c:/Users/rob_b/Ryff/src/lib/rigistry-parser.ts) & [`src/lib/gear-parser.ts`](file:///c:/Users/rob_b/Ryff/src/lib/gear-parser.ts)):**
  - Implemented normalized fuzzy string comparison against catalog records (`rigistry_items`), brand alias lookup, and automated extraction of specs, year, and model from unstructured voice/text logs.

---

### 3. White-Label & Domain-Agnostic Utility
- **Cross-Domain Application:** Domain-agnostic **Catalog Brand Alias & Taxonomy Resolution Engine**.
- **Use Cases for Other Verticals:**
  - 👟 **Footwear:** Automatically match voice logs like *"Added Hoka Clifton 9s"* or *"Brooks Ghost"* to canonical shoe brand catalogs.
  - 🏎️ **Automotive:** Resolve tuner aliases (e.g. *"AMG"*, *"M Division"*, *"Porsche 911GT3"*) to canonical vehicle registries.

---

# White-Label Product Strategy & Domain-Agnostic Architectural Blueprint

This section details the overarching strategic and technical blueprint for re-issuing the Ryff architecture across alternative domains and commercial verticals. The platform is architected around **Three White-Label Product Angles**:

---

## Angle 1: Pre-Built Version (Turnkey Scoped Vertical Deployment)

### 1. Concept & Commercial Model
The **Pre-Built Version** is a done-for-you, turnkey vertical application deployment. Following a client scoping call, the Ryff engineering team replaces domain-specific data sources, marketplace APIs, news feeds, RSS channels, entity keywords, and AI persona profiles with the client's requested vertical domain (e.g. Runners/Running Shoes, Luxury Horology, Classic Automotive, Cycling Fleet).

Once configured, the platform runs 100% identically to Ryff's core engine: executing background RSS ingestion, vector/LLM clustering, persona debates, marketplace deal tracking, and asset logging out of the box.

### 2. Domain Data Source Mapping Table

| Domain / Vertical | Core Data Swap (RSS / Feeds) | Marketplace Ingest API | Asset Logger Focus | AI Personas (Backstage) |
| :--- | :--- | :--- | :--- | :--- |
| **Guitars (Current)** | Premier Guitar, Guitar World, RSS, YouTube | Reverb API | Guitars, Amps, Pedals, Strings | **Hank** (Vintage Luthier) vs **Vee** (Digital Modeller) |
| **Running & Footwear** | Runner’s World, Strava blog, Trail Runner RSS, YouTube | StockX, GOAT, eBay Footwear API | Running Shoes, Mileage, Foam Wear, Price | **Doc** (Podiatrist/Biomechanics) vs **Swift** (Ultra-Marathoner) |
| **Luxury Horology** | Hodinkee, Fratello Watches, Revolution, YouTube | Chrono24, eBay Watches API | Watch Collection, Service History, Timekeeping | **Horace** (Master Watchmaker) vs **Julian** (Independent Collector) |
| **Motorsport & Track Cars** | PistonHeads, Speedhunters, Motorsport RSS, YouTube | AutoTrader, Bring a Trailer API | Garage Vehicles, Track Days, Oil/Tire Wear | **Mac** (Wrench Mechanic) vs **Apex** (Telemetry Engineer) |
| **Specialty Coffee** | James Hoffmann RSS, Perfect Daily Grind, Barista Hustle | Coffee Shrub, Prima Coffee API | Grinders, Machines, Water Recipes, Beans | **Barista Ben** (Traditional Espresso) vs **Science Sam** (Extraction Specialist) |

### 3. Technical Implementation
- **Domain Config Blueprint (`config/domain.config.ts`):** Single declarative configuration file defining feed URLs, marketplace search parameters, brand catalog schemas, and persona system prompts.
- **Pluggable API Adapters (`src/lib/marketplace/adapter.ts`):** Interface for third-party marketplace search, standardizing results into `{ title, price, original_price, days_on_market, image_url, location, url }`.

---

## Angle 2: Builder Version (Self-Serve N8n-Style Dynamic Pipeline & Custom Automation Engine)

### 1. Concept & Commercial Model
The **Builder Version** is a self-serve visual pipeline generator (similar to N8n, Zapier, or Make). Instead of hardcoding vertical sources, end-users input their own tracking variables, RSS feed URLs, social targets, and entity monitor lists via an intuitive UI. 

Our backend automates the orchestration: dynamically spinning up RSS pollers, diyGod / RSSHub bridges, web scrapers, Hansard parliamentary monitors, and Gemini Flash LLM extraction pipelines without requiring manual code changes.

### 2. Primary Example: Political & PR Intelligence ("Restore Britain & MPs")
- **User Input Variables:**
  - **Entities to Monitor:** *Restore Britain*, *Politician X*, *Politician Y*, *Policy Z*.
  - **Data Feeds & Sources:** Hansard Parliamentary Transcripts, BBC News RSS, Guardian Politics RSS, diyGod Twitter/X & Bluesky bridges, YouTube political debate transcripts.
  - **Extraction Schema:** `[Date, Speaker Name, Party/Affiliation, Topic, Direct Quote, Sentiment, Policy Impact]`.
- **Automated Backend Orchestration:**
  1. **Dynamic Poller:** Cron daemon regularly polls registered RSS/API endpoints.
  2. **LLM Extraction Pipeline:** Feeds incoming text to Gemini Flash with user-defined JSON schema to extract quotes, dates, and sentiment.
  3. **Vector Embeddings & Clustering:** Stores quotes in PostgreSQL vector table (`pgvector`), grouping related statements into daily digest clusters.
  4. **Searchable Dataset & Alert Engine:** Enables users to query *"What did Politician X state about energy policy in Q3 2026?"* and pushes daily digest summary alerts.

### 3. Technical Architecture Blueprint
- **Dynamic Source Registry (`sources` table):** Stores user-defined feeds with custom extraction rules, headers, and refresh frequencies.
- **Zero-Code Schema Transformer (`src/lib/builder/transformer.ts`):** Uses structured LLM outputs to transform raw feed items into custom user-defined entity tables.
- **N8n-Style Webhook & Worker Pool:** Asynchronous background worker fleet processing ingested items in real time.

---

## Angle 3: Lightweight Asset-Logger / Maintenance / Spec Tool (Standalone or Embedded Micro-App)

### 1. Concept & Commercial Model
A decoupled, lightweight asset and event logging micro-app that operates either as a standalone tool or embedded within parent application wrappers. It provides structured asset tracking, maintenance alerts, wear calculations, and event logging across two primary sub-types:

---

### Variant 3.i: Footwear & Hard Goods Wear/Usage Logger (Quantitative Tracking)
Designed for physical assets subject to physical wear, usage accumulation, and periodic maintenance.

#### Key Metrics & Features:
- **Asset Profile:** Name, brand, model, acquisition date, initial purchase price (£/$).
- **Usage Telemetry:** Total distance logged (miles/km), total hours in service, usage frequency.
- **Cost-per-Use Analytics:** Real-time calculation of cost-per-mile (`Purchase Price / Total Miles Logged`) to quantify asset value over time.
- **Wear Degradation & Maintenance Alerts:** Automated alerts based on cumulative usage thresholds:
  - *Example (Footwear):* *"Shoe Foam Alert: Hoka Clifton 9 has reached 385 / 400 miles. Midsole cushioning degradation expected."*
  - *Example (Cycling):* *"Chain Wear Alert: 250 km logged since last chain lubrication."*
- **1-Tap Quick-Mic Voice Logger:** Speak voice memos (e.g. *"Ran 8 miles in the Clifton 9s on wet trail"*), parsed automatically by Gemini Flash to increment mileage and record terrain/wear notes.

---

### Variant 3.ii: Definable Structured Event & Statement Logger (Qualitative & Fact-Checking Dataset)
Designed for qualitative event logging, political statement tracking, public record archiving, and quote indexing.

#### Key Metrics & Features:
- **Definable Event Data Schema:** Captures structured records of *"Entity X said/acted Y on Z date"*.
- **Database Fields:**
  - `entity_name`: Name of politician, public figure, or brand.
  - `event_date`: Date statement was made or action occurred.
  - `verbatim_statement`: Full quote or action transcript.
  - `topic_category`: Categorized policy topic or topic tag.
  - `source_url`: Verifiable reference link (Hansard, video transcript, news article).
  - `searchable_vector`: Embeddings for semantic natural language queries.
- **Searchable Query Interface:** Allows users to query complex historical datasets (e.g. *"Show all quotes by Politician X regarding taxation between 2024 and 2026"*).

---

### 2. White-Label Embedding Options
- **Standalone Micro-App:** Lightweight PWA / Web App focused exclusively on asset logging and maintenance.
- **Embedded iFrame / Component Wrapper:** React / Web Component embeddable inside partner platforms, mobile apps, or enterprise dashboards.

---

## Feature: OpenGraph Article Scraper & Automated Feed Image Parsing Engine
- **Date:** October 3, 2026
- **Category:** Content Ingestion / Feed Processing / Media Parsing / Image Extraction

### 1. User & Marketing Overview
Ryff's Digest feed and Gear Radar now display crisp, high-resolution feature photos for over 95% of all news stories and YouTube videos:
- **Zero Blank Cards & Minimal Fallbacks:** Solved the issue where ~60% of RSS articles (from outlets like Ultimate Guitar, The Highway Star, Guitar.com, and niche blogs) lacked inline images in XML feeds and defaulted to generic category place-holders.
- **Automated OpenGraph Page Scraping:** When an RSS feed snippet doesn't contain an explicit image, Ryff automatically fetches the target article's Open Graph metadata (`og:image`, `twitter:image`, `image_src`) directly from the publisher's website.
- **YouTube Media & Shorts Compatibility:** Automatically parses YouTube `<media:group>` tags, Shorts URLs, and embed links to fetch 100% accurate video thumbnails (`hqdefault.jpg`).
- **Database Image Recovery:** Restored high-res hero photographs across existing database history, elevating overall digest image coverage from 34% to over 95%.

---

### 2. Technical Details (For Developers)
- **Enhanced Feed & Media Parser ([`src/lib/feeds.ts`](file:///c:/Users/rob_b/Ryff/src/lib/feeds.ts)):**
  - Updated `rss-parser` custom field definitions to capture `<media:group>` tags (YouTube feed format) and Atom image enclosures.
  - Enhanced `extractImageUrl(item)` regex to extract video IDs from any YouTube watch link, Shorts URL, embed, or `yt:video` ID.
  - Implemented `fetchOgImage(url)` with a fast 4-second timeout, extracting `<meta property="og:image">`, `og:image:url`, `twitter:image`, `twitter:image:src`, and `<link rel="image_src">`.
- **Pipeline Ingestion Integration ([`src/pipeline/ingest.ts`](file:///c:/Users/rob_b/Ryff/src/pipeline/ingest.ts)):**
  - Integrated `fetchOgImage` fallback into `fetchFeed()` so any incoming RSS item lacking XML image tags is enriched with its target webpage's OpenGraph image prior to DB insert.
- **Database Image Backfill Script ([`scripts/backfill-item-images.ts`](file:///c:/Users/rob_b/Ryff/scripts/backfill-item-images.ts)):**
  - Created and executed a parallel batch backfill script processing missing `image_url` fields for 800+ existing DB items.
- **Client Feed Image Component ([`src/app/(app)/digest/DigestFeed.tsx`](file:///c:/Users/rob_b/Ryff/src/app/(app)/digest/DigestFeed.tsx)):**
  - Added `useEffect` state synchronization to the `FeedImage` client component to ensure image states update cleanly during tab switches and category filtering.

---

### 3. White-Label & Domain-Agnostic Utility
- **Cross-Domain Application:** High-Res Media Extraction & OpenGraph Web Scraping Pipeline.
- **Use Cases for Other Verticals:**
  - 🚗 **Automotive News & Classifieds:** Automatically extract cover photos for vehicle reviews and listings where RSS feeds provide text-only excerpts.
  - 👟 **Sneaker & Apparel Drops:** Scrape official product release hero photos from brand blogs and forums.
  - 🏠 **Real Estate / PropTech:** Retrieve high-res listing photos and architectural hero images from property blogs and auction feeds.

