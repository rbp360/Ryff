import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import Parser from 'rss-parser';
import { fetchFeed } from '../src/lib/feeds';

function loadEnv() {
  if (process.env.DATABASE_URL) return;
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [key, ...vals] = trimmed.split('=');
        if (key) {
          const val = vals.join('=').trim().replace(/^["']|["']$/g, '');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const dbUrl = process.env.DATABASE_URL;
const contactEmail = process.env.CONTACT_EMAIL || 'founder@example.com';
const userAgent = `GuitarBot/0.1 (contact: ${contactEmail})`;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function resolveYouTubeUrl(srcUrl: string): Promise<string> {
  if (srcUrl.includes('channel_id=UC')) return srcUrl;
  try {
    const res = await fetch(srcUrl, { headers: { 'User-Agent': userAgent } });
    if (res.ok) {
      const html = await res.text();
      const match = html.match(/channelId["']\s*:\s*["'](UC[\w-]+)["']/);
      if (match && match[1]) {
        return `https://www.youtube.com/feeds/videos.xml?channel_id=${match[1]}`;
      }
    }
  } catch {
    // fallback
  }
  return srcUrl;
}

async function checkFeeds() {
  let sql: ReturnType<typeof postgres> | null = null;
  if (dbUrl) {
    sql = postgres(dbUrl);
  }

  const fixturesDir = path.resolve(process.cwd(), 'fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  console.log('--- Checking Feed Sources ---');

  let sourcesList: { id?: number; name: string; url: string; kind: string }[] = [];

  if (sql) {
    const rows = await sql<{ id: number; name: string; url: string; kind: string }[]>`
      select id, name, url, kind from sources where active = true
    `;
    sourcesList = rows;
  }

  if (sourcesList.length === 0) {
    const configPath = path.resolve(process.cwd(), 'config/sources.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.rss) {
        for (const item of config.rss) {
          sourcesList.push({ name: item.name, url: item.url, kind: 'rss' });
        }
      }
    }
  }

  for (const src of sourcesList) {
    const targetUrl = src.kind === 'youtube' ? await resolveYouTubeUrl(src.url) : src.url;
    console.log(`\nFetching [${src.kind.toUpperCase()}] ${src.name} (${targetUrl})...`);

    const { items, status } = await fetchFeed(targetUrl);
    console.log(`  Result: ${status} | Items: ${items.length}`);

    if (status === 'ok') {
      const itemCount = items.length;
      const newestDate = items[0]?.publishedAt ? items[0].publishedAt.toISOString() : 'Unknown';
      console.log(`  Parse Result: OK | Items: ${itemCount} | Newest Date: ${newestDate}`);
      if (sql && src.id) {
        await sql`update sources set last_fetched_at = now(), last_status = ${`OK (${itemCount} items)`} where id = ${src.id}`;
      }
    } else {
      console.error(`  Fetch/Parse Status: ${status}`);
      if (sql && src.id) {
        await sql`update sources set last_fetched_at = now(), last_status = ${status.slice(0, 50)} where id = ${src.id}`;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  // Fetch Reverb sample fixture
  console.log('\n--- Fetching Reverb Listings Sample Fixture ---');
  try {
    const reverbUrl = 'https://api.reverb.com/api/listings?query=fender&condition=used&per_page=50';
    const res = await fetch(reverbUrl, {
      headers: {
        'Accept': 'application/hal+json',
        'Accept-Version': '3.0',
        'User-Agent': userAgent,
      },
    });

    if (res.ok) {
      const data = await res.json();
      const reverbFixturePath = path.join(fixturesDir, 'reverb-listings.sample.json');
      fs.writeFileSync(reverbFixturePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`  Saved Reverb fixture to: ${path.relative(process.cwd(), reverbFixturePath)}`);
    } else {
      console.log(`  Reverb API returned HTTP ${res.status}: ${res.statusText}. Using fallback sample schema.`);
      createFallbackReverbFixture(fixturesDir);
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.log(`  Reverb API fetch failed (${errMsg}). Creating fallback sample fixture.`);
    createFallbackReverbFixture(fixturesDir);
  }

  if (sql) {
    await sql.end();
  }

  console.log('\nFeed check and fixtures setup complete!');
}

function createFallbackReverbFixture(fixturesDir: string) {
  const sample = {
    total: 1,
    current_page: 1,
    total_pages: 1,
    _links: { self: { href: "https://api.reverb.com/api/listings?query=fender" } },
    listings: [
      {
        id: "12345678",
        title: "Fender Stratocaster American Standard 2012 Sunburst",
        make: "Fender",
        model: "Stratocaster",
        finish: "Sunburst",
        year: "2012",
        price: { amount: "850.00", currency: "GBP", display: "£850.00" },
        condition: { display_name: "Excellent", uuid: "used-excellent" },
        _links: { web: { href: "https://reverb.com/item/12345678-fender-stratocaster" } }
      }
    ]
  };
  const filepath = path.join(fixturesDir, 'reverb-listings.sample.json');
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, JSON.stringify(sample, null, 2), 'utf8');
    console.log(`  Created fallback Reverb fixture at ${path.relative(process.cwd(), filepath)}`);
  }
}

checkFeeds();
