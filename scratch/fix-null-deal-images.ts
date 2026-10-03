import { db } from '../src/lib/db';
import { searchListings } from '../src/lib/reverb';

async function main() {
  console.log('--- Cleaning up null image deals ---');
  // Delete deals with null image_url so only deals with valid Reverb pictures remain
  await db`DELETE FROM deals WHERE image_url IS NULL OR image_url = ''`;
  
  const remaining = await db`SELECT id, want_key, title, image_url FROM deals`;
  console.log('Remaining deals count:', remaining.length);
  console.log('Deals list:', remaining);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
