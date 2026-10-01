import { db } from '../src/lib/db';
import { fetchFeed } from '../src/lib/feeds';

async function testSocial() {
  const sources = await db`
    SELECT id, name, url 
    FROM sources 
    WHERE url LIKE '%localhost:1200%'
    ORDER BY id ASC
  `;
  console.log('Found social sources in DB:', sources.length);
  
  let totalInserted = 0;
  for (const s of sources) {
    const { items, status } = await fetchFeed(s.url);
    console.log(`Source: ${s.name} | Status: ${status} | Items Fetched: ${items.length}`);
    
    let inserted = 0;
    for (const item of items) {
      const res = await db`
        INSERT INTO items (source_id, url_hash, url, title, snippet, published_at)
        VALUES (${s.id}, ${item.urlHash}, ${item.url}, ${item.title}, ${item.snippet}, ${item.publishedAt || db`NOW()`})
        ON CONFLICT (url_hash) DO NOTHING
      `;
      if (res.count > 0) inserted++;
    }
    totalInserted += inserted;
    console.log(`  -> Inserted ${inserted} items`);
  }
  
  console.log(`\n=== Total New Social Items Stored in Ryff Database: ${totalInserted} ===`);
  process.exit(0);
}

testSocial().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
