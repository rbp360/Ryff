# YouTube Closed Caption (CC) & Transcript Parsing (Milestone M5)

## Overview
Milestone M5 upgrades YouTube feed digestion from superficial description box snippets to full spoken closed-caption transcripts. This enables Ryff's editorial pipeline to capture actual creator conclusions, gear verdicts, specs, and pro/con arguments.

## Components & Architecture

### 1. Extraction Module: `src/lib/youtube.ts`
- **URL & Video ID Parsing**: Extracts canonical 11-character video IDs from `watch?v=`, `youtu.be/`, `embed/`, and `shorts/` URLs.
- **Dual-Strategy Transcript Fetcher**:
  1. Primary: InnerTube Android client context via `youtube-transcript`.
  2. Fallback: Direct public watch-page `captionTracks` XML parsing.
- **Sanitization & Formatting**: Decodes HTML entities (`&#39;`, `&quot;`, etc.), normalizes whitespace, and truncates smoothly at sentence boundaries within token budget (~12,000 chars).
- **Polite Rate Limiting**: Built-in `politeDelay(1000)` prevents IP rate-limiting.

### 2. Database Migration: `db/migrations/0005_item_transcripts.sql`
- Adds `transcript text` column to the `items` table so extracted transcripts are cached and never re-fetched unnecessarily.

### 3. Digest Pipeline: `src/pipeline/digest.ts`
- Detects `kind === 'youtube'` items.
- Fetches transcript on-demand if not already cached in Postgres.
- Injects structured `<transcript>...</transcript>` tags into `<item>` blocks for Fast AI consumption.
- Graceful fallback: If captions are disabled or unavailable (e.g. playthrough demos), the item is ingested using title + snippet without breaking the batch.

### 4. Editorial Prompting: `prompts/digest.system.md`
- Instructs the Fast AI model to:
  - Filter out sponsor spots (e.g., Ridge Wallet, BetterHelp), intro banter, and channel housekeeping.
  - Read spoken transcript arguments to determine true gear takeaways.
  - Accurately tag brands, products, players, category, hype, and controversy scores.
