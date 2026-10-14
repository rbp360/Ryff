import { db } from '@/lib/db';
import { fetchFeed } from '@/lib/feeds';
import { clusterAndScoreRecentItems } from '@/lib/clustering';

export interface IngestStats {
  sourcesProcessed: number;
  itemsIngested: number;
  errors: number;
  clustersCount?: number;
  multiSourceClusters?: number;
}

export async function ingestAllFeeds(): Promise<IngestStats> {
  console.log('[Ingest Pipeline] Querying active sources from database...');
  const activeSources = await db`
    SELECT id, name, url, tier, keyword_prefilter, last_status
    FROM sources 
    WHERE active = true
  `;

  console.log(`[Ingest Pipeline] Processing ${activeSources.length} active sources...`);

  let itemsIngested = 0;
  let errors = 0;

  for (let i = 0; i < activeSources.length; i++) {
    const src = activeSources[i];
    console.log(`[Ingest Progress] (${i + 1}/${activeSources.length}) Fetching ${src.name}...`);
    const { items, status } = await fetchFeed(src.url, src.keyword_prefilter);

    const isLocalBridge = src.url.includes('localhost:1200');
    const isForum = src.url.includes('/forums/') || src.url.includes('board/index.php');

    // 1. If local RSSHub bridge is offline in current environment (e.g. running in GitHub Actions / cloud runner)
    if (isLocalBridge && status.startsWith('offline')) {
      console.log(`[Ingest Progress] Source ID ${src.id} (${src.name}): Local RSSHub bridge unreachable in current environment; preserving existing status.`);
      continue;
    }

    // 2. If forum encounters Cloudflare WAF challenge on a datacenter/CI runner
    if (isForum && (status.includes('403') || status.includes('409'))) {
      const prevOk = src.last_status && src.last_status.toLowerCase().startsWith('ok');
      if (prevOk) {
        console.warn(`[Ingest Warn] Source ID ${src.id} (${src.name}): Cloudflare WAF challenge on current runner; retaining healthy cached status.`);
        await db`
          UPDATE sources 
          SET last_fetched_at = NOW()
          WHERE id = ${src.id}
        `;
        continue;
      }
    }

    // 3. Update source fetch status timestamp
    await db`
      UPDATE sources 
      SET last_fetched_at = NOW(), last_status = ${status}
      WHERE id = ${src.id}
    `;

    if (status.startsWith('error')) {
      console.warn(`[Ingest Warn] Source ID ${src.id} (${src.name}): ${status}`);
      errors++;
      continue;
    }

    if (items.length > 0) {
      const candidateItems = items.slice(0, 30);
      const rowsToInsert = candidateItems.map((item) => ({
        source_id: src.id,
        url_hash: item.urlHash,
        url: item.url,
        title: item.title,
        snippet: item.snippet,
        image_url: item.imageUrl || null,
        published_at: item.publishedAt || new Date(),
      }));

      const result = await db`
        INSERT INTO items ${db(rowsToInsert, 'source_id', 'url_hash', 'url', 'title', 'snippet', 'image_url', 'published_at')}
        ON CONFLICT (url_hash) DO UPDATE SET
          image_url = COALESCE(EXCLUDED.image_url, items.image_url)
      `;
      itemsIngested += result.count;
    }

    // Polite delay between sources to respect rate limits (higher for YouTube and Cloudflare-protected forums)
    const delayMs = src.url.includes('youtube.com') ? 1200 : isForum ? 1800 : 400;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  console.log(`[Ingest Complete] Sources: ${activeSources.length} | New Items Stored: ${itemsIngested} | Errors: ${errors}`);

  // Run entity tagging, topic clustering, and buzz calculation
  const clusterStats = await clusterAndScoreRecentItems(72);

  return {
    sourcesProcessed: activeSources.length,
    itemsIngested,
    errors,
    clustersCount: clusterStats.clustersCount,
    multiSourceClusters: clusterStats.multiSourceClusters,
  };
}
