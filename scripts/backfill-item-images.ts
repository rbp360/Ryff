import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

function getDbUrl() {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      return line.split('=')[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  return process.env.DATABASE_URL!;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
];

async function extractOgImageFromUrl(url: string): Promise<string | null> {
  if (!url || url.includes('localhost') || url.includes('example.com')) return null;

  // 1. YouTube video URL check
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const match = url.match(/(?:v=|\/|vi\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
    }
  }

  // 2. OpenGraph / Twitter meta image fetch
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return null;
    const html = await res.text();

    const ogMatch =
      html.match(/<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i) ||
      html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);

    if (ogMatch && ogMatch[1]) {
      let img = ogMatch[1].trim().replace(/&amp;/g, '&');
      if (img.startsWith('//')) {
        img = 'https:' + img;
      } else if (img.startsWith('/')) {
        try {
          const parsed = new URL(url);
          img = `${parsed.protocol}//${parsed.host}${img}`;
        } catch {
          // ignore
        }
      }
      return img;
    }
  } catch {
    // ignore timeouts
  }

  return null;
}

async function backfillAllImages() {
  const sql = postgres(getDbUrl(), { ssl: 'require' });

  console.log('[Backfill] Querying items with missing images...');
  const missingItems = await sql<{ id: number; url: string; title: string; source_name: string }[]>`
    SELECT i.id, i.url, i.title, s.name as source_name
    FROM items i
    JOIN sources s ON i.source_id = s.id
    WHERE i.image_url IS NULL
    ORDER BY i.id DESC
  `;

  console.log(`[Backfill] Found ${missingItems.length} items missing image URLs.`);

  let updatedCount = 0;
  const BATCH_SIZE = 15;

  for (let i = 0; i < missingItems.length; i += BATCH_SIZE) {
    const chunk = missingItems.slice(i, i + BATCH_SIZE);
    
    await Promise.all(
      chunk.map(async (item) => {
        const img = await extractOgImageFromUrl(item.url);
        if (img) {
          await sql`UPDATE items SET image_url = ${img} WHERE id = ${item.id}`;
          updatedCount++;
        }
      })
    );

    console.log(`[Backfill] Processed ${Math.min(i + BATCH_SIZE, missingItems.length)} / ${missingItems.length} (Recovered ${updatedCount} images)`);
  }

  console.log(`\n[Backfill Complete] Total items updated with high-quality images: ${updatedCount} / ${missingItems.length}`);

  // Re-run summary query
  const summary = await sql`
    SELECT 
      COUNT(id) as total_items,
      COUNT(image_url) as items_with_image
    FROM items
  `;
  const grandTotal = Number(summary[0].total_items);
  const grandWithImg = Number(summary[0].items_with_image);
  const pct = grandTotal > 0 ? Math.round((grandWithImg / grandTotal) * 100) : 0;

  console.log(`[Database State] Total items: ${grandTotal} | Items with images: ${grandWithImg} (${pct}%)`);

  await sql.end();
}

backfillAllImages();
