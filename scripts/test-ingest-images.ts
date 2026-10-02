import { ingestAllFeeds } from '../src/pipeline/ingest';
import { db } from '../src/lib/db';

async function test() {
  console.log('Running ingestAllFeeds with image extraction...');
  const stats = await ingestAllFeeds();
  console.log('Ingest stats:', stats);

  const rows = await db`
    select id, title, image_url, category 
    from items 
    where image_url is not null 
    order by id desc
    limit 10
  `;
  console.log(`\nSample ${rows.length} items with extracted image_url:`);
  for (const r of rows) {
    console.log(`- [#${r.id}] ${r.title.slice(0, 50)}...`);
    console.log(`  Image: ${r.image_url}`);
  }
  process.exit(0);
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
