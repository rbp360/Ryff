import { runDebatePipeline } from '../src/pipeline/debate';

async function main() {
  const args = process.argv.slice(2);
  let fromFixture = '';
  let promptVersion = 'v1';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--from-fixture' && args[i + 1]) {
      fromFixture = args[i + 1];
    }
    if (args[i] === '--version' && args[i + 1]) {
      promptVersion = args[i + 1];
    }
  }

  if (!fromFixture) {
    fromFixture = 'items-2026-09-30.json';
  }

  console.log(`=== Running Prompt Evaluation (Version: ${promptVersion}) ===`);
  console.log(`Input Fixture: ${fromFixture}`);

  const res = await runDebatePipeline({
    fromFixture,
    promptVersion,
    limitItems: 6,
  });

  if (res) {
    console.log(`\n[Prompt Eval Completed] Episode #${res.episodeId} generated.`);
    console.log(`Headline: "${res.headline}"`);
    console.log(`Topics count: ${res.topics.length}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Eval error:', err);
  process.exit(1);
});
