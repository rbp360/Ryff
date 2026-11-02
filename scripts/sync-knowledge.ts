import { syncDirtyRigItems } from '../src/lib/knowledge/sync';
import { db } from '../src/lib/db';

/** Backfills the gear knowledge brain from all existing owned rig items. Usage: pnpm knowledge:sync [batchSize] */
async function main() {
  const batch = Number(process.argv[2]) || 25;
  let total = 0;
  for (;;) {
    const res = await syncDirtyRigItems(batch);
    total += res.synced + res.images.embedded;
    console.log(`[knowledge:sync] attempted=${res.attempted} synced=${res.synced} images=${res.images.embedded} failed=${res.failed}`);
    if (res.synced === 0 && res.images.embedded === 0) break;
  }
  console.log(`[knowledge:sync] done, ${total} items synced.`);
  await db.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

