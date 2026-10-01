import { runPipeline } from '../src/pipeline';

async function main() {
  console.log('================================================================');
  console.log('🚀  STARTING RYFF MASTER PIPELINE (CLI)');
  console.log('================================================================\n');

  const result = await runPipeline();

  if (result.status === 'failed') {
    console.error(`\n❌ Execution failed: ${result.error}`);
    process.exit(1);
  }

  process.exit(0);
}

main();
