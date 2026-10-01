import { ingestAllFeeds } from '../src/pipeline/ingest';
import { digestPendingItems } from '../src/pipeline/digest';
import { runDebatePipeline } from '../src/pipeline/debate';
import { checkPipelineSpendCap } from '../src/lib/usage';
import { db } from '../src/lib/db';

async function runMasterPipeline() {
  console.log('================================================================');
  console.log('🚀  STARTING RYFF MASTER PIPELINE RUN');
  console.log('================================================================\n');

  const startTime = Date.now();
  let totalCostUsd = 0;

  // Insert pipeline run record
  const runRecord = await db`
    INSERT INTO pipeline_runs (status)
    VALUES ('running')
    RETURNING id
  `;
  const runId = runRecord[0]?.id;

  try {
    // Step 1: Ingest active feeds
    console.log('▶ [Stage 1/3]: INGEST FEEDS');
    const ingestStats = await ingestAllFeeds();

    // Step 2: Batch digest pending items
    console.log('\n▶ [Stage 2/3]: BATCH DIGEST ITEMS');
    const digestStats = await digestPendingItems(8, 24);
    totalCostUsd += digestStats.totalCostUsd;

    // Check pipeline spend cap guardrail before debate
    const capCheck = checkPipelineSpendCap(totalCostUsd, totalCostUsd);
    if (!capCheck.allowed) {
      throw new Error(`Spend cap triggered before debate stage: ${capCheck.reason}`);
    }

    // Step 3: Run Hank vs Vee 4-Turn Debate & Formatter
    console.log('\n▶ [Stage 3/3]: HANK VS VEE DEBATE & FORMATTING');
    const debateStats = await runDebatePipeline({ limitItems: 8 });
    if (debateStats) {
      totalCostUsd += debateStats.totalCostUsd;
    }

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

    // Update pipeline run record to OK
    await db`
      UPDATE pipeline_runs 
      SET 
        finished_at = NOW(),
        status = 'ok',
        stage_stats = ${JSON.stringify({ ingest: ingestStats, digest: digestStats, debate: debateStats })},
        cost_usd = ${totalCostUsd}
      WHERE id = ${runId}
    `;

    console.log('\n================================================================');
    console.log('✅  PIPELINE EXECUTION COMPLETED SUCCESSFULLY');
    console.log(`⏱️  Duration: ${durationSec}s`);
    console.log(`💰  Total Pipeline Run Spend: $${totalCostUsd.toFixed(6)} (Cap: $2.00)`);
    console.log(`🎙️  Episode Published: ID #${debateStats?.episodeId}`);
    console.log('================================================================\n');

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ [Pipeline Failed]: ${errMsg}`);
    await db`
      UPDATE pipeline_runs 
      SET 
        finished_at = NOW(),
        status = 'failed',
        error = ${errMsg},
        cost_usd = ${totalCostUsd}
      WHERE id = ${runId}
    `;
    process.exit(1);
  }

  process.exit(0);
}

runMasterPipeline();
