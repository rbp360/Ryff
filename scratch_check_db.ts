import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [key, ...vals] = trimmed.split('=');
        if (key && !process.env[key.trim()]) {
          process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  }
}

loadEnv();

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  const runs = await sql`
    SELECT id, started_at, status, cost_usd, error, stage_stats
    FROM pipeline_runs
    ORDER BY id DESC
    LIMIT 3
  `;
  console.log('=== LATEST PIPELINE RUNS ===');
  for (const r of runs) {
    console.log(`Run #${r.id} (${r.status}):`);
    console.log('Error:', r.error);
    console.log('Stage stats:', JSON.stringify(r.stage_stats, null, 2));
  }

  const failingSources = await sql`
    SELECT id, kind, name, url, last_status, last_fetched_at
    FROM sources
    WHERE active = true AND (last_status LIKE 'error%' OR last_status IS NULL)
    ORDER BY name
  `;
  console.log('\n=== FAILING SOURCES (' + failingSources.length + ') ===');
  for (const s of failingSources) {
    console.log(`[${s.kind}] ${s.name}: ${s.last_status} (${s.url})`);
  }

  const okSources = await sql`
    SELECT id, kind, name, url, last_status
    FROM sources
    WHERE active = true AND last_status = 'ok'
    ORDER BY name
  `;
  console.log('\n=== OK SOURCES (' + okSources.length + ') ===');
  for (const s of okSources) {
    console.log(`[${s.kind}] ${s.name}: ${s.last_status}`);
  }

  const ytSources = await sql`
    SELECT id, kind, name, url, last_status
    FROM sources
    WHERE kind = 'youtube'
  `;
  console.log('\n=== YOUTUBE SOURCES IN DB (' + ytSources.length + ') ===');
  for (const s of ytSources) {
    console.log(`[${s.kind}] ${s.name}: ${s.last_status} (${s.url})`);
  }

  // Count items from youtube
  const ytItemCount = await sql`
    SELECT COUNT(*) as count, COUNT(*) FILTER (WHERE digested_at IS NOT NULL) as digested_count
    FROM items i
    JOIN sources s ON s.id = i.source_id
    WHERE s.kind = 'youtube'
  `;
  console.log('\n=== YOUTUBE ITEMS IN DB ===', ytItemCount);

  // Check recent items
  const recentItems = await sql`
    SELECT id, title, published_at, fetched_at, digested_at, relevant
    FROM items
    ORDER BY id DESC
    LIMIT 5
  `;
  console.log('\n=== RECENT ITEMS ===', recentItems);

  await sql.end();
}

main().catch(console.error);
