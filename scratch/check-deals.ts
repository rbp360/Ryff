import { db } from '../src/lib/db';
import { runDealsPipeline } from '../src/pipeline/deals';

async function main() {
  console.log('--- Checking current deals in DB ---');
  const currentDeals = await db`SELECT id, want_key, title, image_url FROM deals`;
  console.log('Current deals count:', currentDeals.length);
  console.log('Sample current deals:', currentDeals.slice(0, 5));

  console.log('\n--- Running Deals Pipeline to refresh/fetch image URLs ---');
  const res = await runDealsPipeline();
  console.log('Pipeline result:', res);

  const updatedDeals = await db`SELECT id, want_key, title, image_url FROM deals`;
  console.log('\nUpdated deals count:', updatedDeals.length);
  console.log('Updated deals with images:', updatedDeals.map(d => ({ title: d.title, image_url: d.image_url })));

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
