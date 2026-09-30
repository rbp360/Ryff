# Guitar Community & News Ingestion Specification

## 1. Overview & Execution Profile
- **Polling Interval:** Once every 24 hours (`0 0 * * *` cron schedule recommended).
- **Primary Ingestion Strategy:** XML/RSS/Atom feeds (avoids DOM parsing, anti-bot mitigations, and layout shifts).
- **Secondary Strategy:** Standard HTTP GET with custom `User-Agent` headers for sites lacking deep XML content.
- **Deduplication Key:** Combination of `feed_source` + `guid` (or canonical `link` if `guid` is absent).

---

## 2. Target Matrix & Feed Endpoints

| # | Target Name | Primary Website URL | Feed / Target Endpoint | Feed Type | Ingestion Strategy |
|---|-------------|---------------------|------------------------|-----------|--------------------|
| 1 | **Jemsite** | `https://www.jemsite.com` | `https://www.jemsite.com/forums/-/index.rss` | RSS 2.0 | Poll root RSS or append `index.rss` to target forum IDs. |
| 2 | **TDPRI** | `https://www.tdpri.com` | `https://www.tdpri.com/forums/-/index.rss` | RSS 2.0 | Native XenForo feed. Subforums follow `forums/{slug}.{id}/index.rss`. |
| 3 | **The Gear Page (TGP)** | `https://www.thegearpage.net` | `https://www.thegearpage.net/board/index.php?forums/-/index.rss` | RSS 2.0 | Standard XenForo root feed. RSS bypasses frontend Cloudflare checks. |
| 4 | **The Gear Forum** | `https://thegearforum.com` | `https://thegearforum.com/forums/-/index.rss` | RSS 2.0 | XenForo root feed. Clean structure, low throttling risks. |
| 5 | **Rig-Talk** | `https://www.rig-talk.com` | `https://www.rig-talk.com/forum/forums/-/index.rss` | RSS 2.0 | XenForo root feed. |
| 6 | **Guitar Player** | `https://www.guitarplayer.com` | `https://www.guitarplayer.com/feeds/all` | RSS 2.0 / Atom | Future Plc syndication endpoint. Filter by `guitarplayer.com/feeds/tag/guitars` if needed. |
| 7 | **Ultimate Guitar** | `https://www.ultimate-guitar.com` | `https://www.ultimate-guitar.com/news/rss` | RSS 2.0 | News feed only. Forum thread scraping requires browser automation (Cloudflare-gated). |
| 8 | **MusicRadar** | `https://www.musicradar.com` | `https://www.musicradar.com/feeds/all` | RSS 2.0 / Atom | Future Plc syndication endpoint. Category feed: `musicradar.com/feeds/tag/guitars`. |
| 9 | **The Music Zoo** | `https://www.themusiczoo.com` | `https://www.themusiczoo.com/blogs/news.atom`<br>`https://www.themusiczoo.com/collections/all.atom` | Atom (Shopify) | Ingest `.atom` endpoints for blog news or new inventory arrivals. |
| 10 | **Premier Guitar** | `https://www.premierguitar.com` | `https://www.premierguitar.com/feeds/feed.rss` | RSS 2.0 | Standard publication feed containing title, excerpt, and author. |
| 11 | **GuitarGuitar** | `https://www.guitarguitar.co.uk` | `https://www.guitarguitar.co.uk/news/` | HTML Scraping | No active public RSS. Ingest `/news/` HTML via standard parser once daily. |

---

## 3. Implementation Notes for the Ingestion Agent

### 3.1. XenForo Native Patterns (Sites 1, 2, 3, 4, 5)
XenForo supports native syndication at both the global forum level and individual subforum levels:
- **Global recent threads:** `https://<domain>/forums/-/index.rss`
- **Subforum recent threads:** `https://<domain>/forums/<forum-slug>.<forum-id>/index.rss`
- *Example (TDPRI Telecaster Discussion):*  
  `https://www.tdpri.com/forums/telecaster-discussion-forum.2/index.rss`
- **Benefit:** No HTML parsing required. Each item contains `<title>`, `<link>`, `<pubDate>`, `<dc:creator>`, and `<description>` (first post excerpt).

### 3.2. Shopify Feed Patterns (Site 9 - The Music Zoo)
Shopify natively exposes Atom feeds on standard resources:
- Articles / Blog: `/blogs/<blog-slug>.atom`
- Products / Categories: `/collections/<collection-slug>.atom` (or `.json` if using API headers)

### 3.3. HTTP Headers & Rate Limits
- Set a custom, descriptive `User-Agent` (e.g., `User-Agent: GuitarIntelligenceBot/1.0 (+contact@yourdomain.com)`).
- For Future Plc feeds (Guitar Player, MusicRadar), set standard `Accept: application/rss+xml, application/atom+xml, text/xml`.
- When polling once every 24 hours, add a 2–3 second jitter/sleep between endpoints to prevent burst rate-limiting.

### 3.4. Deduplication Schema (SQLite / Postgres)
```sql
CREATE TABLE IF NOT EXISTS scraped_feed_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_name TEXT NOT NULL,
    guid TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.5. Recommended Parsing Library
- **Python:** Use `feedparser` (`pip install feedparser`) for automatic handling of mixed RSS 2.0, Atom, and encoding variants.
- **Node.js:** Use `rss-parser` (`npm install rss-parser`).