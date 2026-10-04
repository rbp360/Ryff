import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { db } from '../src/lib/db';
import { logMaintenanceSchema, addWantSchema, normalizeRegion } from '../src/lib/command/tools';
import { resolveGearReference } from '../src/lib/command/resolve';
import { routeCommand } from '../src/lib/command/router';
import { POST } from '../src/app/api/command/route';
import { NextRequest } from 'next/server';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000002';

vi.mock('../src/lib/session', () => ({
  getSession: vi.fn(async () => ({
    userId: '00000000-0000-0000-0000-000000000002',
    email: 'step2_tester@ryff.local',
    cohort: 'cadre',
    isAdult: true,
  })),
}));

describe('Step 2: Tool-Calling Backend & Router', { timeout: 30000 }, () => {
  let prsId: number;
  let fenderStratId: number;
  let squierStratId: number;

  beforeAll(async () => {
    // 1. Ensure test user exists
    await db`
      insert into users (id, email, is_adult, consented_at, cohort)
      values (${TEST_USER_ID}, 'step2_tester@ryff.local', true, now(), 'cadre')
      on conflict (id) do nothing
    `;

    // 2. Clean up any previous test items for this user
    await db`delete from rig_item_logs where rig_item_id in (select id from rig_items where user_id = ${TEST_USER_ID})`;
    await db`delete from assistant_actions where user_id = ${TEST_USER_ID}`;
    await db`delete from rig_items where user_id = ${TEST_USER_ID}`;

    // 3. Insert owned gear fixtures:
    // Item 1: PRS CE 24 (nickname: "Bluebird")
    const [prs] = await db`
      insert into rig_items (
        user_id, kind, brand, model, nickname, category, raw_text
      ) values (
        ${TEST_USER_ID}, 'own', 'PRS', 'CE 24', 'Bluebird', 'guitar', 'PRS CE 24 Bluebird'
      ) returning id
    `;
    prsId = Number(prs.id);

    // Item 2: Fender American Standard Stratocaster (nickname: "Old Sunburst")
    const [fenderStrat] = await db`
      insert into rig_items (
        user_id, kind, brand, model, nickname, category, raw_text
      ) values (
        ${TEST_USER_ID}, 'own', 'Fender', 'American Standard Stratocaster', 'Old Sunburst', 'guitar', 'Fender American Standard Stratocaster'
      ) returning id
    `;
    fenderStratId = Number(fenderStrat.id);

    // Item 3: Squier Classic Vibe 60s Stratocaster
    const [squierStrat] = await db`
      insert into rig_items (
        user_id, kind, brand, model, nickname, category, raw_text
      ) values (
        ${TEST_USER_ID}, 'own', 'Squier', 'Classic Vibe 60s Stratocaster', null, 'guitar', 'Squier Classic Vibe 60s Stratocaster'
      ) returning id
    `;
    squierStratId = Number(squierStrat.id);
  });

  afterAll(async () => {
    // Cleanup test artifacts
    await db`delete from rig_item_logs where rig_item_id in (select id from rig_items where user_id = ${TEST_USER_ID})`;
    await db`delete from assistant_actions where user_id = ${TEST_USER_ID}`;
    await db`delete from rig_items where user_id = ${TEST_USER_ID}`;
    await db`delete from users where id = ${TEST_USER_ID}`;
  });

  describe('Validation & Tool Schemas (tools.ts)', () => {
    it('validates log_maintenance arguments and rejects invalid event types', () => {
      const valid = logMaintenanceSchema.safeParse({
        gear_ref: 'PRS',
        event_type: 'strings',
        event_date: '2026-10-04',
        notes: 'Strung with Elixir 9-42',
      });
      expect(valid.success).toBe(true);

      const invalidType = logMaintenanceSchema.safeParse({
        gear_ref: 'PRS',
        event_type: 'demolish',
      });
      expect(invalidType.success).toBe(false);

      const invalidDate = logMaintenanceSchema.safeParse({
        gear_ref: 'PRS',
        event_type: 'setup',
        event_date: 'October 4th',
      });
      expect(invalidDate.success).toBe(false);
    });

    it('validates add_want arguments and enforces constraints', () => {
      const valid = addWantSchema.safeParse({
        item_text: 'Soldano SLO-100',
        region: 'UK_ONLY',
        max_price: 2000,
        currency: 'GBP',
        alert: true,
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.alert).toBe(true);
        expect(valid.data.currency).toBe('GBP');
      }

      const negativePrice = addWantSchema.safeParse({
        item_text: 'Soldano SLO-100',
        max_price: -500,
      });
      expect(negativePrice.success).toBe(false);
    });

    it('normalizes colloquial spoken regions to reverb_region enums', () => {
      expect(normalizeRegion('England')).toBe('UK_ONLY');
      expect(normalizeRegion('UK')).toBe('UK_ONLY');
      expect(normalizeRegion('britain')).toBe('UK_ONLY');
      expect(normalizeRegion('scotland')).toBe('UK_ONLY');
      expect(normalizeRegion('US')).toBe('US_ONLY');
      expect(normalizeRegion('united states')).toBe('US_ONLY');
      expect(normalizeRegion('worldwide')).toBe('WORLDWIDE');
      expect(normalizeRegion('ships to uk')).toBe('SHIPS_TO_UK');
      expect(normalizeRegion('Mars')).toBeUndefined();
    });
  });

  describe('Gear Reference Resolution (resolve.ts)', () => {
    it('resolves unique brand/model reference', async () => {
      const res = await resolveGearReference(TEST_USER_ID, 'the PRS');
      expect(res.status).toBe('resolved');
      if (res.status === 'resolved') {
        expect(res.gear.id).toBe(prsId);
      }
    });

    it('resolves unique nickname reference', async () => {
      const res = await resolveGearReference(TEST_USER_ID, 'Bluebird');
      expect(res.status).toBe('resolved');
      if (res.status === 'resolved') {
        expect(res.gear.id).toBe(prsId);
      }
    });

    it('returns ambiguous with candidates when multiple guitars match (never guesses)', async () => {
      const res = await resolveGearReference(TEST_USER_ID, 'my Strat');
      expect(res.status).toBe('ambiguous');
      if (res.status === 'ambiguous') {
        expect(res.candidates.length).toBe(2);
        const candidateIds = res.candidates.map((c) => c.id);
        expect(candidateIds).toContain(fenderStratId);
        expect(candidateIds).toContain(squierStratId);
      }
    });

    it('uses screen context activeGearId to disambiguate or resolve generic reference', async () => {
      // 1. Generic reference "this guitar" on active gear page
      const resGeneric = await resolveGearReference(TEST_USER_ID, 'this guitar', squierStratId);
      expect(resGeneric.status).toBe('resolved');
      if (resGeneric.status === 'resolved') {
        expect(resGeneric.gear.id).toBe(squierStratId);
      }

      // 2. Ambiguous reference "the Strat" disambiguated by active screen gearId
      const resContext = await resolveGearReference(TEST_USER_ID, 'the Strat', fenderStratId);
      expect(resContext.status).toBe('resolved');
      if (resContext.status === 'resolved') {
        expect(resContext.gear.id).toBe(fenderStratId);
      }
    });

    it('returns unresolved for gear not owned by user', async () => {
      const res = await resolveGearReference(TEST_USER_ID, 'my Banjo');
      expect(res.status).toBe('unresolved');
    });
  });

  describe('Multi-Action & Want Router (router.ts)', () => {
    it('handles multi-action command: strings and springs on the PRS', async () => {
      const countLogsBefore = await db`select count(*) as c from rig_item_logs where user_id = ${TEST_USER_ID}`;
      const countGearBefore = await db`select count(*) as c from rig_items where user_id = ${TEST_USER_ID}`;

      const result = await routeCommand({
        userId: TEST_USER_ID,
        message: 'Just put a new set of Elixir 9-42 on the PRS and adjusted the springs',
      });

      expect(result.ok).toBe(true);
      expect(result.proposals?.length).toBe(2);

      // Verify both proposals resolve to the PRS
      for (const proposal of result.proposals || []) {
        expect(proposal.targetGear?.id).toBe(prsId);
        expect(proposal.status).toBe('proposed');
        expect(proposal.id).toBeDefined();
      }

      const stringAction = result.proposals?.find((p) => (p.arguments as any).event_type === 'strings');
      const springAction = result.proposals?.find((p) => ['hardware', 'setup'].includes((p.arguments as any).event_type));
      expect(stringAction).toBeDefined();
      expect(springAction).toBeDefined();

      // Verify proposals are persisted in assistant_actions table with status = 'proposed'
      const savedActions = await db`
        select id, tool_name, status, arguments
        from assistant_actions
        where user_id = ${TEST_USER_ID} and status = 'proposed'
      `;
      expect(savedActions.length).toBeGreaterThanOrEqual(2);

      // CRITICAL: Zero writes to rig_item_logs or rig_items in Step 2!
      const countLogsAfter = await db`select count(*) as c from rig_item_logs where user_id = ${TEST_USER_ID}`;
      const countGearAfter = await db`select count(*) as c from rig_items where user_id = ${TEST_USER_ID}`;
      expect(Number(countLogsAfter[0].c)).toBe(Number(countLogsBefore[0].c));
      expect(Number(countGearAfter[0].c)).toBe(Number(countGearBefore[0].c));
    });

    it('handles marketplace want command: Soldano SLO-100 in England under 2 grand', async () => {
      const countGearBefore = await db`select count(*) as c from rig_items where user_id = ${TEST_USER_ID}`;

      const result = await routeCommand({
        userId: TEST_USER_ID,
        message: "I'm after a Soldano SLO-100 in England but I don't want to pay over two grand",
      });

      expect(result.ok).toBe(true);
      expect(result.proposals?.length).toBe(1);

      const wantProposal = result.proposals![0];
      expect(wantProposal.tool).toBe('add_want');
      expect(wantProposal.status).toBe('proposed');

      const args = wantProposal.arguments as any;
      expect(args.item_text.toLowerCase()).toContain('soldano');
      expect(args.region).toBe('UK_ONLY');
      expect(args.max_price).toBe(2000);
      expect(args.alert).toBe(true);

      // CRITICAL: Zero writes to rig_items in Step 2!
      const countGearAfter = await db`select count(*) as c from rig_items where user_id = ${TEST_USER_ID}`;
      expect(Number(countGearAfter[0].c)).toBe(Number(countGearBefore[0].c));
    });

    it('handles ambiguous command by returning candidates and proposing zero writes', async () => {
      const actionsCountBefore = await db`select count(*) as c from assistant_actions where user_id = ${TEST_USER_ID}`;
      const logsCountBefore = await db`select count(*) as c from rig_item_logs where user_id = ${TEST_USER_ID}`;

      const result = await routeCommand({
        userId: TEST_USER_ID,
        message: 'Restrung the Strat today',
      });

      expect(result.ok).toBe(true);
      expect(result.proposals?.length).toBe(0);
      expect(result.ambiguous).toBeDefined();
      expect(result.ambiguous?.length).toBeGreaterThan(0);

      const candidates = result.ambiguous?.[0]?.candidates || [];
      expect(candidates.length).toBe(2);
      const candidateIds = candidates.map((c) => c.id);
      expect(candidateIds).toContain(fenderStratId);
      expect(candidateIds).toContain(squierStratId);

      // Zero new rows in assistant_actions or rig_item_logs
      const actionsCountAfter = await db`select count(*) as c from assistant_actions where user_id = ${TEST_USER_ID}`;
      const logsCountAfter = await db`select count(*) as c from rig_item_logs where user_id = ${TEST_USER_ID}`;
      expect(Number(actionsCountAfter[0].c)).toBe(Number(actionsCountBefore[0].c));
      expect(Number(logsCountAfter[0].c)).toBe(Number(logsCountBefore[0].c));
    });
  });

  describe('POST /api/command Integration', () => {
    it('returns structured proposals with status proposed from API endpoint', async () => {
      const req = new NextRequest('http://localhost:3000/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Just put a new set of Elixir 9-42 on the PRS and adjusted the springs',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.status).toBe('proposed');
      expect(data.proposals.length).toBe(2);
      expect(data.proposals[0].targetGear.id).toBe(prsId);
    });
  });
});
