import fs from 'fs';
import path from 'path';
import { db } from '../lib/db';
import { env } from '../lib/env';

export interface RawFeedItem {
  sourceId: number;
  url: string;
  urlHash: string;
  title: string;
  snippet: string;
  publishedAt?: Date;
}

export function computeUrlHash(url: string): string {
  // Simple deterministic string hash for deduplication keying
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'hash_' + Math.abs(hash).toString(36);
}

export async function ingestSampleFeeds(sampleLimit: number = 5) {
  console.log(`[Ingest] Ingesting up to ${sampleLimit} items from saved local feed fixtures...`);

  // Load active sources from database
  const activeSources = await db`SELECT id, name, url, tier FROM sources WHERE active = true`;
  console.log(`[Ingest] Found ${activeSources.length} active sources in database.`);

  let totalIngested = 0;
  const fixturesDir = path.resolve(process.cwd(), 'fixtures');

  if (fs.existsSync(fixturesDir)) {
    const files = fs.readdirSync(fixturesDir).filter(f => f.startsWith('feed-') && f.endsWith('.xml'));
    for (const file of files.slice(0, 3)) { // Limit to 3 feed files for small sample test
      const content = fs.readFileSync(path.join(fixturesDir, file), 'utf8');
      
      // Basic extraction of items from XML fixture
      const titleMatches = [...content.matchAll(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/g)];
      const linkMatches = [...content.matchAll(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/g)];

      const sourceId = activeSources[0]?.id || 1;

      for (let i = 0; i < Math.min(titleMatches.length, sampleLimit); i++) {
        const title = titleMatches[i]?.[1]?.trim();
        const rawUrl = linkMatches[i]?.[1]?.trim() || `https://example.com/item-${i}`;

        if (!title || title.toLowerCase().includes('feed')) continue;

        const urlHash = computeUrlHash(rawUrl);
        const snippet = `Sample feed item snippet for: ${title.slice(0, 80)}`;

        await db`
          INSERT INTO items (source_id, url_hash, url, title, snippet, published_at, relevant, summary, item_type)
          VALUES (
            ${sourceId},
            ${urlHash},
            ${rawUrl},
            ${title},
            ${snippet},
            NOW(),
            true,
            ${`Summary of ${title.slice(0, 30)}`},
            'news'
          )
          ON CONFLICT (url_hash) DO NOTHING
        `;
        totalIngested++;
      }
    }
  }

  console.log(`[Ingest Complete] ${totalIngested} feed items stored in database.`);
  return totalIngested;
}
