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
  // 1. YouTube video URL check first (instant, 0 network requests)
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const match = url.match(/(?:v=|\/|vi\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
    }
  }

  // 2. Fetch page HTML and look for OpenGraph / Twitter images
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENTS[0],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Check og:image, og:image:url, twitter:image, twitter:image:src
    const ogMatch = 
      html.match(/<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i) ||
      html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);

    if (ogMatch && ogMatch[1]) {
      let img = ogMatch[1].trim();
      // Resolve relative URLs
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
  } catch (err) {
    // Ignore fetch timeout/errors
  }

  return null;
}

async function testOgScrapingOnMissingItems() {
  const sql = postgres(getDbUrl(), { ssl: 'require' });

  const missingItems = await sql`
    SELECT i.id, i.title, i.url, s.name as source_name, s.kind as source_kind
    FROM items i
    JOIN sources s ON i.source_id = s.id
    WHERE i.image_url IS NULL
    LIMIT 30
  `;

  console.log(`Testing OG image scraping on ${missingItems.length} items currently missing images...\n`);

  let recovered = 0;
  for (const item of missingItems) {
    const img = await extractOgImageFromUrl(item.url);
    if (img) {
      recovered++;
      console.log(`✅ [RECOVERED] ${item.source_name}: "${item.title.slice(0, 45)}"`);
      console.log(`   Image: ${img.slice(0, 80)}`);
    } else {
      console.log(`❌ [FAILED] ${item.source_name}: "${item.title.slice(0, 45)}" (${item.url.slice(0, 40)})`);
    }
  }

  console.log(`\nResults: Recovered ${recovered} / ${missingItems.length} missing images (${Math.round((recovered / missingItems.length) * 100)}%)`);

  await sql.end();
}

testOgScrapingOnMissingItems();
