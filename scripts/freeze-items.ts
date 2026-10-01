import { db } from '../src/lib/db';
import fs from 'fs';
import path from 'path';

async function freezeCurrentItems() {
  const today = new Date().toISOString().split('T')[0];
  const filename = `items-${today}.json`;
  const targetPath = path.resolve(process.cwd(), 'fixtures/frozen', filename);

  console.log(`[Freeze Tool] Querying top digested items to freeze to ${filename}...`);

  const digestedItems = await db`
    SELECT id, source_id, url, title, snippet, published_at, digested_at, relevant, summary, item_type, brands, products, hype
    FROM items
    WHERE digested_at IS NOT NULL
    ORDER BY published_at DESC NULLS LAST, id DESC
    LIMIT 50
  `;

  if (digestedItems.length === 0) {
    console.warn('[Freeze Tool] No digested items found in database to freeze.');
    process.exit(1);
  }

  fs.writeFileSync(targetPath, JSON.stringify(digestedItems, null, 2), 'utf8');
  console.log(`[Freeze Tool] Successfully froze ${digestedItems.length} items to ${targetPath}`);
  process.exit(0);
}

freezeCurrentItems().catch(err => {
  console.error('[Freeze Tool Error]:', err);
  process.exit(1);
});
