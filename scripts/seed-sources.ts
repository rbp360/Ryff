import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

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

if (!dbUrl) {
  console.error('DATABASE_URL environment variable is missing.');
  process.exit(1);
}

const sql = postgres(dbUrl);

interface SourceJsonItem {
  name: string;
  url?: string;
  channel_id?: string;
  tier: 'news' | 'brand_pr' | 'video';
  keyword_prefilter?: string[];
}

interface SourcesConfig {
  rss?: SourceJsonItem[];
  youtube?: SourceJsonItem[];
  reverb?: SourceJsonItem[];
}

async function seedSources() {
  try {
    const configPath = path.resolve(process.cwd(), 'config/sources.json');
    if (!fs.existsSync(configPath)) {
      console.error('config/sources.json not found.');
      process.exit(1);
    }

    const config: SourcesConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    console.log('Seeding sources into database...');

    let insertedCount = 0;

    // Seed RSS
    if (config.rss) {
      for (const src of config.rss) {
        if (!src.url) continue;
        await sql`
          insert into sources (kind, name, url, tier, keyword_prefilter, active)
          values ('rss', ${src.name}, ${src.url}, ${src.tier}, ${src.keyword_prefilter || null}, true)
          on conflict (url) do update set
            name = excluded.name,
            tier = excluded.tier,
            keyword_prefilter = excluded.keyword_prefilter
        `;
        insertedCount++;
      }
    }

    // Seed YouTube
    if (config.youtube) {
      for (const src of config.youtube) {
        if (!src.channel_id || src.channel_id.includes('___')) continue;
        const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${src.channel_id}`;
        await sql`
          insert into sources (kind, name, url, tier, keyword_prefilter, active)
          values ('youtube', ${src.name}, ${feedUrl}, ${src.tier || 'video'}, null, true)
          on conflict (url) do update set
            name = excluded.name,
            tier = excluded.tier
        `;
        insertedCount++;
      }
    }

    const activeUrls: string[] = [];
    if (config.rss) {
      for (const src of config.rss) {
        if (src.url) activeUrls.push(src.url);
      }
    }
    if (config.youtube) {
      for (const src of config.youtube) {
        if (src.channel_id && !src.channel_id.includes('___')) {
          activeUrls.push(`https://www.youtube.com/feeds/videos.xml?channel_id=${src.channel_id}`);
        }
      }
    }

    if (activeUrls.length > 0) {
      const deactivated = await sql`
        update sources set active = false where url not in ${sql(activeUrls)} and active = true
      `;
      console.log(`Deactivated ${deactivated.count} removed/stale sources.`);
    }

    console.log(`Seeded ${insertedCount} active sources successfully.`);
  } catch (err) {
    console.error('Failed to seed sources:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seedSources();
