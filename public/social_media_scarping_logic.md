# Hybrid Ingestion Engine Architecture & Implementation Spec

## 1. System Overview & Ingestion Strategy

This system is an automated intelligence aggregator designed to collect music tech, amplifier maintenance, and audio gear data across open feeds and social media without incurring paid enterprise API tiers or triggering anti-bot bans.

The ingestion follows a strict two-tier routing architecture:

* **Tier 1 (Direct Open Feeds - ~90% of Volume):** 
  Direct, unauthenticated HTTP GET requests against open RSS/Atom feeds:
  * YouTube channel feeds via `https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}`
  * Standard website blogs, podcasts, and news feeds (WordPress, Substack, Shopify `.atom`)
  * Public Reddit subreddit endpoints via `https://www.reddit.com/r/{subreddit}/.rss` (requires custom `User-Agent`)
* **Tier 2 (Bridge / Walled Garden Fallback - ~10% of Volume):**
  For creators and brands whose updates exist exclusively behind walled platforms (Instagram, TikTok, X):
  * Routes traffic through a self-hosted instance of [DIYgod/RSSHub](https://github.com/DIYgod/RSSHub) running in Docker.
  * Employs local Redis caching and residential/local IP egress to prevent IP blacklisting.
  * Injects dummy/burner account session cookies where basic auth is mandated.

---

## 2. PostgreSQL Schema Specification

Run the following DDL statements to set up the ingestion registries and target content storage:

```sql
-- 1. Creator & Feed Source Registry
CREATE TABLE feed_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    creator_host VARCHAR(255),
    category_vertical VARCHAR(100),
    platform VARCHAR(50) NOT NULL,            -- 'youtube', 'blog', 'podcast', 'reddit', 'instagram', 'tiktok'
    ingest_tier VARCHAR(20) NOT NULL,          -- 'open_direct', 'rsshub_bridge'
    primary_url TEXT NOT NULL,
    feed_url TEXT NOT NULL,                    -- Direct RSS URL or internal RSSHub bridge URL
    rsshub_route TEXT,                         -- e.g. '/instagram/user/robchapman' (if applicable)
    etag VARCHAR(255),
    last_modified VARCHAR(255),
    fetch_interval_minutes INT DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    last_fetched_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Unified Ingested Items
CREATE TABLE feed_items (
    id SERIAL PRIMARY KEY,
    source_id INT REFERENCES feed_sources(id) ON DELETE CASCADE,
    guid TEXT UNIQUE NOT NULL,                 -- Canonical URL or feed GUID
    title TEXT NOT NULL,
    item_url TEXT NOT NULL,
    author VARCHAR(255),
    content_snippet TEXT,
    full_content TEXT,
    media_enclosure_url TEXT,
    raw_payload JSONB,
    published_at TIMESTAMP WITH TIME ZONE,
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_feed_sources_active ON feed_sources(is_active, last_fetched_at);
CREATE INDEX idx_feed_items_guid ON feed_items(guid);
CREATE INDEX idx_feed_items_published ON feed_items(published_at DESC);