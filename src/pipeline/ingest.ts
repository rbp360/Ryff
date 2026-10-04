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
    SELECT id, name, url, tier, keyword_prefilter 
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

    // Update source fetch status timestamp
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

    for (const item of items) {
      const result = await db`
        INSERT INTO items (source_id, url_hash, url, title, snippet, image_url, published_at)
        VALUES (
          ${src.id},
          ${item.urlHash},
          ${item.url},
          ${item.title},
          ${item.snippet},
          ${item.imageUrl || null},
          ${item.publishedAt || db`NOW()`}
        )
        ON CONFLICT (url_hash) DO UPDATE SET
          image_url = COALESCE(EXCLUDED.image_url, items.image_url)
      `;
      if (result.count > 0) {
        itemsIngested++;
      }
    }

    // Polite delay between sources to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 150));
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
