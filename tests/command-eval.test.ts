import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { db } from '../src/lib/db';
import { routeCommand } from '../src/lib/command/router';

interface EvalCase {
  id: string;
  category: string;
  description: string;
  message: string;
  context?: { screen?: string; gearId?: string };
  gearFixture: Array<{
    id: number;
    brand: string;
    model: string;
    category: string;
    raw_text: string;
  }>;
  expected: {
    intent?: string;
    status?: string;
    tools?: string[];
    toolCount?: number;
    proposalsCount?: number;
    event_type?: string;
    event_date?: string;
    region?: string;
    max_price?: number;
    currency?: string;
    prefKey?: string;
    prefValue?: string;
    prefValues?: string[];
    targetGearId?: number;
    unresolvedCount?: number;
  };
}

describe('Step 5: Command Evaluation Suite (Benchmark >= 90%)', { timeout: 90000 }, () => {
  let evalCases: EvalCase[] = [];
  const gearMap = new Map<string, Map<number, number>>();
  const evalResults: Array<{ id: string; passed: boolean; reason?: string }> = [];

  const getUserId = (idx: number) =>
    `ffffffff-0000-0000-0000-${String(idx + 1).padStart(12, '0')}`;

  beforeAll(async () => {
    const filePath = path.resolve(process.cwd(), 'tests/command-eval.json');
    const content = fs.readFileSync(filePath, 'utf8');
    evalCases = JSON.parse(content);

    // 1. Clean existing eval users (strictly isolated to ffffffff prefix)
    await db`delete from users where id::text like 'ffffffff-0000-0000-0000-%'`;

    // 2. Parallel setup of test users and gear fixtures for all cases
    await Promise.all(
      evalCases.map(async (tc, idx) => {
        const uId = getUserId(idx);
        await db`
          insert into users (id, email, cohort, uk_resident, is_adult, consented_at)
          values (${uId}, ${`eval-${idx + 1}@ryff.app`}, 'cadre', true, true, now())
          on conflict (id) do nothing
        `;

        const caseGear = new Map<number, number>();
        if (tc.gearFixture && tc.gearFixture.length > 0) {
          for (const item of tc.gearFixture) {
            const [inserted] = await db`
              insert into rig_items (
                user_id, raw_text, brand, model, category, kind
              ) values (
                ${uId}, ${item.raw_text}, ${item.brand}, ${item.model}, ${item.category}, 'own'
              ) returning id
            `;
            caseGear.set(item.id, Number(inserted.id));
          }
        }
        gearMap.set(tc.id, caseGear);
      })
    );
  }, 60000);

  afterAll(async () => {
    await db`delete from users where id::text like 'ffffffff-0000-0000-0000-%'`;
  });

  it('runs all benchmark evaluation cases and validates results', async () => {
    expect(evalCases.length).toBeGreaterThanOrEqual(50);

    const BATCH_SIZE = 6;
    for (let batchStart = 0; batchStart < evalCases.length; batchStart += BATCH_SIZE) {
      const batch = evalCases.slice(batchStart, batchStart + BATCH_SIZE);
      await Promise.all(
        batch.map(async (tc, offset) => {
          const i = batchStart + offset;
          const uId = getUserId(i);
          const caseGear = gearMap.get(tc.id) || new Map();

          // Resolve context gearId if mapped
          const resolvedContext = { ...tc.context };
          if (resolvedContext.gearId) {
            const numId = parseInt(resolvedContext.gearId, 10);
            if (caseGear.has(numId)) {
              resolvedContext.gearId = String(caseGear.get(numId));
            }
          }

          const result = await routeCommand({
            userId: uId,
            message: tc.message,
            context: resolvedContext,
          });

      let passed = true;
      const reasons: string[] = [];

      if (tc.expected.intent && result.intent !== tc.expected.intent) {
        passed = false;
        reasons.push(`intent expected '${tc.expected.intent}' but got '${result.intent}'`);
      }

      if (tc.expected.status && result.status !== tc.expected.status) {
        passed = false;
        reasons.push(`status expected '${tc.expected.status}' but got '${result.status}'`);
      }

      if (tc.expected.proposalsCount !== undefined) {
        const count = result.proposals?.length || 0;
        if (count !== tc.expected.proposalsCount) {
          passed = false;
          reasons.push(`proposalsCount expected ${tc.expected.proposalsCount} but got ${count}`);
        }
      }

      if (tc.expected.toolCount !== undefined) {
        const count = result.proposals?.length || 0;
        if (count !== tc.expected.toolCount) {
          passed = false;
          reasons.push(`toolCount expected ${tc.expected.toolCount} but got ${count}`);
        }
      }

      if (tc.expected.tools && result.proposals) {
        const actualTools = result.proposals.map((p) => p.tool);
        for (const expectedTool of tc.expected.tools) {
          if (!actualTools.includes(expectedTool as any)) {
            passed = false;
            reasons.push(`tool '${expectedTool}' not in [${actualTools.join(', ')}]`);
          }
        }
      }

      if (tc.expected.region && result.proposals) {
        const want = result.proposals.find((p) => p.tool === 'add_want');
        if (!want || want.arguments?.region !== tc.expected.region) {
          passed = false;
          reasons.push(`region expected '${tc.expected.region}' but got '${want?.arguments?.region}'`);
        }
      }

      if (tc.expected.max_price !== undefined && result.proposals) {
        const want = result.proposals.find((p) => p.tool === 'add_want');
        if (!want || want.arguments?.max_price !== tc.expected.max_price) {
          passed = false;
          reasons.push(`max_price expected ${tc.expected.max_price} but got ${want?.arguments?.max_price}`);
        }
      }

      if (tc.expected.prefKey && result.proposals) {
        const pref = result.proposals.find((p) => p.tool === 'set_preference');
        if (!pref || pref.arguments?.key !== tc.expected.prefKey) {
          passed = false;
          reasons.push(`prefKey expected '${tc.expected.prefKey}' but got '${pref?.arguments?.key}'`);
        }
      }

      if (tc.expected.prefValue && result.proposals) {
        const pref = result.proposals.find((p) => p.tool === 'set_preference');
        if (!pref || pref.arguments?.value !== tc.expected.prefValue) {
          passed = false;
          reasons.push(`prefValue expected '${tc.expected.prefValue}' but got '${pref?.arguments?.value}'`);
        }
      }

      if (tc.expected.targetGearId && result.proposals) {
        const targetId = caseGear.get(tc.expected.targetGearId);
        const maint = result.proposals.find((p) => p.tool === 'log_maintenance');
        if (!maint || maint.targetGear?.id !== targetId) {
          passed = false;
          reasons.push(`targetGearId expected ${targetId} but got ${maint?.targetGear?.id}`);
        }
      }

      evalResults.push({
        id: tc.id,
        passed,
        reason: reasons.length > 0 ? reasons.join('; ') : undefined,
      });
    }));
  }

  const passedCount = evalResults.filter((r) => r.passed).length;
  const accuracy = (passedCount / evalResults.length) * 100;

  console.log(`\n======================================================`);
  console.log(`COMMAND EVALUATION BENCHMARK RESULTS:`);
  console.log(`Total test cases: ${evalResults.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${evalResults.length - passedCount}`);
  console.log(`Accuracy: ${accuracy.toFixed(1)}% (Threshold: >= 90%)`);
  console.log(`======================================================\n`);

  const failures = evalResults.filter((r) => !r.passed);
  if (failures.length > 0) {
    console.warn('Failures detail:', failures);
  }

  expect(accuracy).toBeGreaterThanOrEqual(90);
}, 120000);
});
