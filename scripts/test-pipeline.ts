import { ingestAllFeeds } from '../src/pipeline/ingest';
import { digestPendingItems } from '../src/pipeline/digest';
import { runDebatePipeline } from '../src/pipeline/debate';

async function main() {
  console.log('=== M1 Pipeline Small Sample Dry-Run ===');

  // Step 1: Ingest sample feeds
  await ingestAllFeeds();

  // Step 2: Digest items
  await digestPendingItems(4, 4);

  // Step 3: Run debate
  const debateResult = await runDebatePipeline({ limitItems: 4 });

  if (debateResult) {
    console.log('\n[Episode Generated Successfully]:');
    console.log(`Headline: ${debateResult.headline}`);
    console.log(`Topic: ${debateResult.topics[0]?.title}`);
    console.log(`Hank: ${debateResult.topics[0]?.hank}`);
    console.log(`Vee: ${debateResult.topics[0]?.vee}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Pipeline error:', err);
  process.exit(1);
});
