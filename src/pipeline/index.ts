import { db } from '@/lib/db';
import { ingestAllFeeds, IngestStats } from './ingest';
import { digestPendingItems } from './digest';
import { runDebatePipeline } from './debate';
import { runDealsPipeline, DealsStageResult } from './deals';
import { checkPipelineSpendCap } from '@/lib/usage';

export interface PipelineOptions {
  limitDebateItems?: number;
  maxDigestItems?: number;
  digestBatchSize?: number;
  promptVersion?: string;
  fromFixture?: string;
  skipDebate?: boolean;
  skipDeals?: boolean;
}

export interface RetentionStats {
  purgedItems: number;
  purgedMessages: number;
}

export interface PipelineResult {
  runId: number;
  status: 'ok' | 'partial' | 'failed';
  totalCostUsd: number;
  stageStats: {
    ingest?: IngestStats;
    digest?: { digestedCount: number; totalCostUsd: number };
    debate?: { episodeId?: number; totalCostUsd: number } | null;
    deals?: DealsStageResult;
    retention?: RetentionStats;
  };
  error?: string;
}

/**
 * Runs data retention cleanup:
 * - Purges items older than 30 days
 * - Purges chat messages older than 90 days
 */
export async function runRetentionCleanup(): Promise<RetentionStats> {
  console.log('[Retention] Running data retention cleanup...');
  
  // 1. Purge items older than 30 days
  const itemResult = await db`
    DELETE FROM items 
    WHERE (published_at < NOW() - INTERVAL '30 days')
       OR (published_at IS NULL AND fetched_at < NOW() - INTERVAL '30 days')
  `;
  const purgedItems = itemResult.count ?? 0;

  // 2. Purge messages older than 90 days
  const msgResult = await db`
    DELETE FROM messages 
    WHERE created_at < NOW() - INTERVAL '90 days'
  `;
  const purgedMessages = msgResult.count ?? 0;

  console.log(`[Retention Complete] Purged ${purgedItems} items (>30d) and ${purgedMessages} messages (>90d).`);
  return { purgedItems, purgedMessages };
}

/**
 * Master pipeline orchestrator:
 * Ingest -> Batch Digest -> 4-Turn Debate & Formatter -> Reverb Deal Matcher -> Retention
 */
export async function runPipeline(options: PipelineOptions = {}): Promise<PipelineResult> {
  const startTime = Date.now();
  let totalCostUsd = 0;

  const stageStats: PipelineResult['stageStats'] = {};
  let runId = 0;

  try {
    // 1. Initialize pipeline_runs record
    const runRecord = await db`
      INSERT INTO pipeline_runs (status)
      VALUES ('running')
      RETURNING id
    `;
    runId = Number(runRecord[0]?.id);

    // Stage 1: Ingest active feeds
    console.log(`\n--- [Pipeline Run #${runId}] Stage 1: Ingest Feeds ---`);
    const ingestStats = await ingestAllFeeds();
    stageStats.ingest = ingestStats;

    // Stage 2: Batch digest pending items
    console.log(`\n--- [Pipeline Run #${runId}] Stage 2: Batch Digest Items ---`);
    const maxDigest = options.maxDigestItems ?? 24;
    const batchSize = options.digestBatchSize ?? 8;
    const digestStats = await digestPendingItems(batchSize, maxDigest);
    stageStats.digest = digestStats;
    totalCostUsd += digestStats.totalCostUsd;

    // Check pipeline spend cap guardrail before debate stage
    const capCheck = checkPipelineSpendCap(totalCostUsd, totalCostUsd);
    if (!capCheck.allowed) {
      throw new Error(`Pipeline spend cap triggered before debate: ${capCheck.reason}`);
    }

    // Stage 3: Debate & Formatter
    if (!options.skipDebate) {
      console.log(`\n--- [Pipeline Run #${runId}] Stage 3: Hank vs Vee Debate & Formatting ---`);
      const debateStats = await runDebatePipeline({
        limitItems: options.limitDebateItems ?? 8,
        promptVersion: options.promptVersion,
        fromFixture: options.fromFixture,
      });
      stageStats.debate = debateStats;
      if (debateStats?.totalCostUsd) {
        totalCostUsd += debateStats.totalCostUsd;
      }
    }

    // Stage 4: Reverb Deal Matcher
    if (!options.skipDeals) {
      console.log(`\n--- [Pipeline Run #${runId}] Stage 4: Reverb Deal Matcher ---`);
      const dealsStats = await runDealsPipeline();
      stageStats.deals = dealsStats;
    }

    // Stage 5: Retention cleanup
    console.log(`\n--- [Pipeline Run #${runId}] Stage 5: Retention Cleanup ---`);
    const retentionStats = await runRetentionCleanup();
    stageStats.retention = retentionStats;

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

    // Update pipeline_runs status to 'ok'
    await db`
      UPDATE pipeline_runs 
      SET 
        finished_at = NOW(),
        status = 'ok',
        stage_stats = ${JSON.stringify(stageStats)},
        cost_usd = ${totalCostUsd}
      WHERE id = ${runId}
    `;

    console.log(`\n✅ [Pipeline Run #${runId} OK] Finished in ${durationSec}s | Total Cost: $${totalCostUsd.toFixed(6)}`);
    return {
      runId,
      status: 'ok',
      totalCostUsd,
      stageStats,
    };

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ [Pipeline Run #${runId} FAILED]: ${errMsg}`);

    // Update pipeline_runs status to 'failed' (or 'partial' if ingest succeeded)
    const finalStatus = stageStats.ingest ? 'partial' : 'failed';
    await db`
      UPDATE pipeline_runs 
      SET 
        finished_at = NOW(),
        status = ${finalStatus},
        stage_stats = ${JSON.stringify(stageStats)},
        error = ${errMsg},
        cost_usd = ${totalCostUsd}
      WHERE id = ${runId}
    `;

    return {
      runId,
      status: finalStatus,
      totalCostUsd,
      stageStats,
      error: errMsg,
    };
  }
}
