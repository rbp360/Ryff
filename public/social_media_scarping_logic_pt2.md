3. Infrastructure Setup: RSSHub Bridge (Docker Compose)
For walled-garden routes, deploy RSSHub alongside Redis using Docker Compose:

YAML
version: '3.8'

services:
  rsshub:
    image: diygod/rsshub:chromium-bundled
    container_name: rsshub_service
    restart: always
    ports:
      - "1200:1200"
    environment:
      NODE_ENV: production
      CACHE_TYPE: redis
      REDIS_URL: 'redis://redis_cache:6379/'
      CACHE_EXPIRE: 7200                       # Cache responses for 2 hours (limits outgoing hits)
      # Optional: Add burner account session tokens if querying restricted profiles
      # INSTAGRAM_COOKIE: 'sessionid=YOUR_BURNER_SESSION_ID;'
      # TWITTER_AUTH_TOKEN: 'YOUR_BURNER_AUTH_TOKEN'
    depends_on:
      - redis_cache

  redis_cache:
    image: redis:alpine
    container_name: rsshub_redis
    restart: always
    volumes:
      - redis_data:/data

volumes:
  redis_data:
4. Ingestion Worker Implementation (Node.js / TypeScript)
This worker fetches sources due for an update, respects conditional headers (ETag / If-Modified-Since), handles custom User-Agent strings, and deduplicates items on insert.

TypeScript
import { Pool } from 'pg';
import Parser from 'rss-parser';

interface FeedSource {
  id: number;
  name: string;
  feed_url: string;
  ingest_tier: string;
  etag: string | null;
  last_modified: string | null;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const parser = new Parser({
  headers: {
    'User-Agent': 'GearIntelligenceAggregator/1.0 (contact: admin@yourdomain.com)',
  },
});

export async function processFeeds(): Promise<void> {
  const client = await pool.connect();
  try {
    // Select feeds that are active and either never fetched or overdue
    const query = `
      SELECT id, name, feed_url, ingest_tier, etag, last_modified
      FROM feed_sources
      WHERE is_active = TRUE
        AND (last_fetched_at IS NULL 
             OR last_fetched_at <= NOW() - (fetch_interval_minutes || ' minutes')::INTERVAL)
      ORDER BY last_fetched_at ASC NULLS FIRST
      LIMIT 20;
    `;
    const { rows: sources } = await client.query<FeedSource>(query);

    for (const source of sources) {
      console.log(`[Ingest] Processing: ${source.name} via ${source.feed_url}`);
      try {
        const feed = await parser.parseURL(source.feed_url);

        for (const item of feed.items) {
          const guid = item.id || item.guid || item.link;
          if (!guid) continue;

          const insertItemQuery = `
            INSERT INTO feed_items (
              source_id, guid, title, item_url, author, content_snippet, published_at, raw_payload
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (guid) DO NOTHING;
          `;

          await client.query(insertItemQuery, [
            source.id,
            guid,
            item.title || 'Untitled',
            item.link,
            item.creator || item.author || null,
            item.contentSnippet || item.summary || null,
            item.pubDate ? new Date(item.pubDate) : new Date(),
            JSON.stringify(item),
          ]);
        }

        // Update last fetch timestamp
        await client.query(
          `UPDATE feed_sources SET last_fetched_at = CURRENT_TIMESTAMP WHERE id = $1;`,
          [source.id]
        );
      } catch (err: any) {
        console.error(`[Error] Failed to ingest ${source.name}:`, err.message);
      }
    }
  } finally {
    client.release();
  }
}
5. Walkthrough: Human & Agent Workflow Steps
Step 1: Human Configuration
Initialize the PostgreSQL schema using the DDL provided in Section 2.

Launch the RSSHub Docker container:

Bash
docker-compose up -d
Populate feed_sources with your known channels and blogs:

YouTube: Resolve the channel's 24-character Channel ID (UC...) and set feed_url to https://www.youtube.com/feeds/videos.xml?channel_id=UC....

Blogs/Podcasts: Use their direct RSS/Atom endpoint.

Reddit: Append .rss to the community URL (e.g., https://www.reddit.com/r/ToobAmps/.rss).

Walled-Garden Creators: For creators found on Instagram without a site/YouTube feed, set feed_url to http://localhost:1200/instagram/user/{username} and ingest_tier = 'rsshub_bridge'.

Step 2: Agent Implementation Tasks
Environment Setup: Ensure Node.js 18+ or Python 3.11+ is configured with access to DATABASE_URL.

Scheduler Deployment: Schedule processFeeds() via a Node-cron job, BullMQ queue, or a lightweight AWS Lambda / Cloudflare Worker running every 15 minutes.

HTTP User-Agent Enforcement: Ensure all HTTP client requests declare a clear, non-generic User-Agent header to prevent 429/403 rate limits on Reddit and open blogs.

Channel ID Resolver Tooling: Implement a small utility to auto-resolve YouTube handles (e.g., @PsionicAudio) to their canonical UC... Channel IDs by fetching the public channel source and extracting the channelId meta tag before inserting new records.