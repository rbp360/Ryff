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
