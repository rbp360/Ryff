import crypto from 'crypto';
import { db } from './db';

// Known notable guitarists, bassists, and artists for entity extraction
export const NOTABLE_PLAYERS: string[] = [
  'Slash', 'Jimi Hendrix', 'Jimmy Page', 'Eddie Van Halen', 'Eric Clapton',
  'Stevie Ray Vaughan', 'David Gilmour', 'Jeff Beck', 'B.B. King', 'Chuck Berry',
  'Keith Richards', 'Brian May', 'Tony Iommi', 'Kirk Hammett', 'James Hetfield',
  'John Petrucci', 'Steve Vai', 'Joe Satriani', 'Yngwie Malmsteen', 'Chris Impellitteri',
  'Nita Strauss', 'Mark Tremonti', 'Tom Morello', 'Jack White', 'John Mayer',
  'Tosin Abasi', 'Tim Henson', 'Mateus Asato', 'Polyphia', 'Plini',
  'Guthrie Govan', 'Paul Gilbert', 'Zakk Wylde', 'Dimebag Darrell', 'Randy Rhoads',
  'George Lynch', 'Marty Friedman', 'Jason Becker', 'Joe Bonamassa', 'Gary Moore',
  'Rory Gallagher', 'Robin Trower', 'Alex Lifeson', 'Pete Townshend', 'Angus Young',
  'Malcolm Young', 'Carlos Santana', 'Mark Knopfler', 'The Edge', 'Johnny Marr',
  'Kurt Cobain', 'Jerry Cantrell', 'Kim Thayil', 'Billy Corgan', 'Dave Mustaine',
  'Kerry King', 'Jeff Hanneman', 'Dave Grohl', 'Mick Thomson', 'Jim Root',
  'Synyster Gates', 'Zacky Vengeance', 'Misha Mansoor', 'Jake Bowen', 'Mark Holcomb',
  'Cory Wong', 'Marcus King', 'Christone Kingfish Ingram', 'Derek Trucks', 'Warren Haynes',
  'Joe Pass', 'Wes Montgomery', 'Django Reinhardt', 'Pat Metheny', 'Allan Holdsworth',
  'Al Di Meola', 'John McLaughlin', 'Julian Lage', 'Matteo Mancuso', 'Lari Basilio',
  'Yvette Young', 'Orianthi', 'Sophie Lloyd', 'Geddy Lee', 'Flea', 'Les Claypool',
  'Jaco Pastorius', 'Victor Wooten', 'Marcus Miller', 'Cliff Burton', 'Billy Sheehan'
];

// Noise words and prefixes to strip from article titles
const NOISE_PREFIX_REGEX = /^(watch|review|exclusive|breaking|listen|video|podcast|interview|hands-on|first look|opinion)\s*[:-]\s*/i;
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'up', 'about', 'into', 'over', 'after', 'beneath', 'under', 'above',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'can', 'could', 'should', 'would', 'will', 'just', 'how', 'why', 'what', 'when',
  'where', 'who', 'which', 'this', 'that', 'these', 'those', 'it', 'its', 'new', 'guitar',
  'guitars', 'best', 'top', 'out', 'all', 'more', 'get', 'got', 'make', 'made',
  'watch', 'review', 'exclusive', 'breaking', 'listen', 'video', 'podcast', 'interview'
]);

/**
 * Normalizes text to extract salient keywords for clustering
 */
export function extractSalientKeywords(title: string): string[] {
  let cleaned = title.trim();
  // Strip repeated noise prefixes like "Watch: Breaking Review -"
  while (NOISE_PREFIX_REGEX.test(cleaned)) {
    cleaned = cleaned.replace(NOISE_PREFIX_REGEX, '').trim();
  }

  cleaned = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();

  return cleaned
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

/**
 * Extracts player/artist names mentioned in text
 */
export function extractPlayers(text: string, customPlayers: string[] = []): string[] {
  const allPlayers = Array.from(new Set([...NOTABLE_PLAYERS, ...customPlayers]));
  const matched: string[] = [];

  for (const player of allPlayers) {
    // Check whole word match or surname match if distinctive (>=6 chars)
    const escaped = player.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(text)) {
      matched.push(player);
      continue;
    }

    // Check distinctive surname (e.g. "Impellitteri", "Malmsteen", "Satriani", "Iommi", "Tremonti")
    const parts = player.split(' ');
    if (parts.length > 1) {
      const surname = parts[parts.length - 1];
      if (surname && surname.length >= 6) {
        const surnameRegex = new RegExp(`\\b${surname}\\b`, 'i');
        if (surnameRegex.test(text) && !matched.includes(player)) {
          matched.push(player);
        }
      }
    }
  }

  return matched;
}

/**
 * Extracts brands from text using known brand keys
 */
export function extractBrandsFromText(text: string, knownBrands: string[]): string[] {
  const matched: string[] = [];
  const lowerText = text.toLowerCase();

  for (const b of knownBrands) {
    if (!b || b.length < 2) continue;
    const lowerB = b.toLowerCase();
    
    // Exact word boundary match
    const regex = new RegExp(`(^|[^a-z0-9])${lowerB}([^a-z0-9]|$)`, 'i');
    if (regex.test(lowerText) && !matched.includes(b)) {
      matched.push(b);
    }
  }

  return matched;
}

/**
 * Generates a deterministic cluster fingerprint for a story
 */
export function generateClusterKey(
  title: string,
  brands: string[],
  players: string[],
  publishedAt: Date | null
): string {
  const dateKey = publishedAt ? publishedAt.toISOString().slice(0, 10) : 'nodate';
  const primaryBrand = brands[0]?.toLowerCase() || '';
  const primaryPlayer = players[0]?.toLowerCase() || '';

  const keywords = extractSalientKeywords(title).slice(0, 4).sort().join('-');
  const rawKey = `${dateKey}:${primaryBrand}:${primaryPlayer}:${keywords}`;

  return crypto.createHash('sha256').update(rawKey).digest('hex').slice(0, 16);
}

export interface ClusteredItem {
  id: number;
  source_id: number;
  title: string;
  snippet: string | null;
  published_at: Date | null;
  cluster_id: string | null;
  buzz_count: number;
  brands: string[];
  players: string[];
}

/**
 * Scans recent items, tags entities (players/brands), detects clusters,
 * updates buzz counts, and records story clusters.
 */
export async function clusterAndScoreRecentItems(windowHours: number = 72): Promise<{
  processedItems: number;
  clustersCount: number;
  multiSourceClusters: number;
}> {
  console.log(`[Clustering] Loading recent items from past ${windowHours} hours...`);

  // 1. Fetch distinct canonical brands from Rigistry catalog
  const brandRows = await db`
    select distinct name from brands order by name asc limit 500
  `;
  const knownBrands = brandRows.map(r => r.name);

  // 2. Fetch custom favorite players from active users
  const userPlayerRows = await db`
    select distinct unnest(favorite_players) as player from users where favorite_players is not null
  `;
  const customPlayers = userPlayerRows.map(r => r.player).filter(Boolean);

  // 3. Fetch items from the window
  const items = await db`
    select id, source_id, title, snippet, published_at, fetched_at, brands, players, cluster_id, buzz_count
    from items
    where (
      published_at >= now() - make_interval(hours => ${windowHours})
      or (published_at is null and fetched_at >= now() - make_interval(hours => ${windowHours}))
    )
    order by id asc
  `;

  if (items.length === 0) {
    console.log('[Clustering] No items found in the time window.');
    return { processedItems: 0, clustersCount: 0, multiSourceClusters: 0 };
  }

  console.log(`[Clustering] Processing ${items.length} items for entity tagging and clustering...`);

  // Map to group items into clusters
  const clusterMap = new Map<string, {
    items: Array<typeof items[0]>;
    sources: Set<number>;
    earliest: Date;
    latest: Date;
    title: string;
    brand?: string;
    player?: string;
  }>();

  const processedMap = new Map<number, {
    id: number;
    clusterId: string;
    buzzCount: number;
    brands: string[];
    players: string[];
  }>();

  for (const it of items) {
    const fullText = `${it.title} ${it.snippet || ''}`;
    const detectedBrands = extractBrandsFromText(fullText, knownBrands);
    const detectedPlayers = extractPlayers(fullText, customPlayers);

    // Merge detected brands with existing brands
    const combinedBrands = Array.from(new Set([...(it.brands || []), ...detectedBrands]));
    const combinedPlayers = Array.from(new Set([...(it.players || []), ...detectedPlayers]));

    const pubDate = it.published_at ? new Date(it.published_at) : new Date(it.fetched_at);
    const clusterId = generateClusterKey(it.title, combinedBrands, combinedPlayers, pubDate);

    // Collect cluster data
    if (!clusterMap.has(clusterId)) {
      clusterMap.set(clusterId, {
        items: [],
        sources: new Set(),
        earliest: pubDate,
        latest: pubDate,
        title: it.title,
        brand: combinedBrands[0],
        player: combinedPlayers[0],
      });
    }

    const cluster = clusterMap.get(clusterId)!;
    cluster.items.push(it);
    cluster.sources.add(it.source_id);
    if (pubDate < cluster.earliest) cluster.earliest = pubDate;
    if (pubDate > cluster.latest) cluster.latest = pubDate;

    processedMap.set(Number(it.id), {
      id: Number(it.id),
      clusterId,
      buzzCount: 1,
      brands: combinedBrands,
      players: combinedPlayers,
    });
  }

  let multiSourceClusters = 0;

  // 4. Calculate buzz scores for all clusters
  for (const [, c] of clusterMap.entries()) {
    const articleCount = c.items.length;
    const sourceCount = c.sources.size;
    const buzzScore = sourceCount * 2 + Math.max(0, articleCount - sourceCount);

    if (sourceCount > 1) {
      multiSourceClusters++;
    }

    for (const it of c.items) {
      const rec = processedMap.get(Number(it.id));
      if (rec) {
        rec.buzzCount = buzzScore;
      }
    }
  }

  // 5. Batch update items in parallel chunks of 20
  const processedList = Array.from(processedMap.values());
  const chunkSize = 20;
  for (let i = 0; i < processedList.length; i += chunkSize) {
    const chunk = processedList.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map((it) =>
        db`
          update items
          set 
            cluster_id = ${it.clusterId},
            buzz_count = ${it.buzzCount},
            brands = ${it.brands},
            players = ${it.players}
          where id = ${it.id}
        `
      )
    );
  }

  // 6. Batch upsert story_clusters in parallel chunks of 20
  const clusterEntries = Array.from(clusterMap.entries());
  for (let i = 0; i < clusterEntries.length; i += chunkSize) {
    const chunk = clusterEntries.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(([clusterId, c]) => {
        const topItemId = c.items[0]?.id || null;
        return db`
          insert into story_clusters (
            id, headline, canonical_brand, canonical_player, article_count, source_count, top_item_id, first_seen_at, last_seen_at
          ) values (
            ${clusterId},
            ${c.title},
            ${c.brand || null},
            ${c.player || null},
            ${c.items.length},
            ${c.sources.size},
            ${topItemId},
            ${c.earliest},
            ${c.latest}
          )
          on conflict (id) do update set
            article_count = excluded.article_count,
            source_count = excluded.source_count,
            top_item_id = excluded.top_item_id,
            last_seen_at = excluded.last_seen_at
        `;
      })
    );
  }

  console.log(`[Clustering Complete] Processed: ${items.length} items | Formed ${clusterMap.size} clusters (${multiSourceClusters} multi-source buzz clusters).`);

  return {
    processedItems: items.length,
    clustersCount: clusterMap.size,
    multiSourceClusters,
  };
}
