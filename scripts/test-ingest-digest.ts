import { ingestAllFeeds } from '../src/pipeline/ingest';
import { digestPendingItems } from '../src/pipeline/digest';
import { db } from '../src/lib/db';

async function testIngestAndDigest() {
  console.log('=== Testing Live Feed Ingest & Batch Digest Pipeline ===\n');

  // Step 1: Ingest live RSS and YouTube feeds
  const ingestStats = await ingestAllFeeds();

  // Step 2: Batch digest pending items
  const digestStats = await digestPendingItems(8, 16); // Digest up to 16 items in 2 batches

  // Step 3: Verify digested database rows
  const digestedSample = await db`
    SELECT id, title, relevant, summary, item_type, brands, hype 
    FROM items 
    WHERE digested_at IS NOT NULL 
    ORDER BY id DESC 
    LIMIT 5
  `;

  console.log('\n=== Digested Database Items Sample ===');
  digestedSample.forEach((item, idx) => {
    console.log(`\n[Item #${idx + 1}] ID: ${item.id}`);
    console.log(`Title: ${item.title}`);
    console.log(`Type: ${item.item_type} | Hype: ${item.hype} | Relevant: ${item.relevant}`);
    console.log(`Summary: ${item.summary}`);
    console.log(`Brands: ${JSON.stringify(item.brands)}`);
  });

  process.exit(0);
}

testIngestAndDigest().catch(err => {
  console.error('Ingest & Digest Test Failed:', err);
  process.exit(1);
});
