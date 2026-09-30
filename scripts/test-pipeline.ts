import { ingestSampleFeeds } from '../src/pipeline/ingest';
import { digestPendingItems } from '../src/pipeline/digest';
import { generateDebateEpisode } from '../src/pipeline/debate';
import { db } from '../src/lib/db';

async function main() {
  console.log('=== M1 Pipeline Small Sample Dry-Run ===');

  // Step 1: Ingest small sample
  const count = await ingestSampleFeeds(3);

  // Step 2: Fetch items
  const items = await digestPendingItems(3);

  // Step 3: Run debate (mocked/paused before LLM call)
  const debateResult = await generateDebateEpisode(items.map(it => ({ id: Number(it.id), title: String(it.title), summary: String(it.snippet) })));

  console.log('\n[Episode Generated Successfully]:');
  console.log(`Headline: ${debateResult.headline}`);
  console.log(`Topic: ${debateResult.topics[0]?.title}`);
  console.log(`Hank: ${debateResult.topics[0]?.hank}`);
  console.log(`Vee: ${debateResult.topics[0]?.vee}`);

  process.exit(0);
}

main().catch(err => {
  console.error('Pipeline error:', err);
  process.exit(1);
});
