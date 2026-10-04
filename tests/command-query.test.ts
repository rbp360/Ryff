import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../src/lib/db';
import { classifyIntent } from '../src/lib/command/intent';
import { answerAppHelp, clearHelpCache, normalizeHelpQuestion } from '../src/lib/command/help';
import { queryRig, queryDeals } from '../src/lib/command/query';
import {
  recordAssistantCost,
  checkAssistantQuota,
  getDailyAssistantCostsByUser,
} from '../src/lib/command/cost-logger';
import { routeCommand } from '../src/lib/command/router';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000041';
const OTHER_USER_ID = '00000000-0000-0000-0000-000000000042';

describe('Step 4: Query Tools, App Help, Caching & Cost Control', { timeout: 30000 }, () => {
  let prsId: number;
  let strat1Id: number;
  let strat2Id: number;

  beforeAll(async () => {
    // 1. Ensure test users exist
    await db`
      insert into users (id, email, cohort, uk_resident, is_adult, consented_at)
      values 
        (${TEST_USER_ID}, 'step4-test@ryff.app', 'cadre', true, true, now()),
        (${OTHER_USER_ID}, 'step4-other@ryff.app', 'public', false, true, now())
      on conflict (id) do nothing
    `;

    // 2. Clean previous test items for isolation
    await db`delete from assistant_cost_logs where user_id in (${TEST_USER_ID}, ${OTHER_USER_ID})`;
    await db`delete from assistant_actions where user_id in (${TEST_USER_ID}, ${OTHER_USER_ID})`;
    await db`delete from rig_item_logs where user_id in (${TEST_USER_ID}, ${OTHER_USER_ID})`;
    await db`delete from rig_items where user_id in (${TEST_USER_ID}, ${OTHER_USER_ID})`;
    await db`delete from deals where want_key = 'soldano slo-100'`;

    // 3. Seed test instruments
    const [prs] = await db`
      insert into rig_items (
        user_id, kind, brand, model, nickname, category, raw_text,
        tuning, string_gauge, string_manufacturer, last_restrung_at
      ) values (
        ${TEST_USER_ID}, 'own', 'PRS', 'Custom 24', 'Blue Dream', 'guitars', 'PRS Custom 24',
        'Drop D', '009-042 (Super Light)', 'Elixir', '2026-09-15'
      ) returning id
    `;
    prsId = Number(prs.id);

    // Seed string change log for PRS
    await db`
      insert into rig_item_logs (
        rig_item_id, user_id, event_type, event_date, title, description, component, source
      ) values (
        ${prsId}, ${TEST_USER_ID}, 'strings', '2026-09-15', 'Log: String Change on PRS Custom 24', 'Elixir 9-42 strings installed', 'Strings', 'assistant'
      )
    `;

    // Two Strats for ambiguity testing
    const [s1] = await db`
      insert into rig_items (user_id, kind, brand, model, category, raw_text)
      values (${TEST_USER_ID}, 'own', 'Fender', 'American Standard Stratocaster', 'guitars', 'Fender Strat')
      returning id
    `;
    strat1Id = Number(s1.id);

    const [s2] = await db`
      insert into rig_items (user_id, kind, brand, model, category, raw_text)
      values (${TEST_USER_ID}, 'own', 'Squier', 'Classic Vibe 50s Stratocaster', 'guitars', 'Squier Strat')
      returning id
    `;
    strat2Id = Number(s2.id);

    // Seed a want and a matching deal
    await db`
      insert into rig_items (
        user_id, kind, brand, model, raw_text, budget_gbp, currency, alert, want_key
      ) values (
        ${TEST_USER_ID}, 'want', 'Soldano', 'SLO-100', 'Soldano SLO-100 Head', 2000, 'GBP', true, 'soldano slo-100'
      )
    `;

    await db`
      insert into deals (
        want_key, listing_id, listing_url, title, price_amount, price_currency, price_drop_text, published_at, seen_at
      ) values (
        'soldano slo-100', 'reverb-test-123', 'https://reverb.com/item/123', 'Soldano SLO-100 100W Tube Head - Mint', 1850, 'GBP', 'was £1,995', now() - interval '14 days', now()
      ) on conflict (want_key, listing_id) do update set title = excluded.title
    `;
  }, 30000);

  afterAll(async () => {
    await db`delete from assistant_cost_logs where user_id in (${TEST_USER_ID}, ${OTHER_USER_ID})`;
    await db`delete from assistant_actions where user_id in (${TEST_USER_ID}, ${OTHER_USER_ID})`;
    await db`delete from rig_item_logs where user_id in (${TEST_USER_ID}, ${OTHER_USER_ID})`;
    await db`delete from rig_items where user_id in (${TEST_USER_ID}, ${OTHER_USER_ID})`;
    await db`delete from deals where want_key = 'soldano slo-100'`;
    await db`delete from users where id in (${TEST_USER_ID}, ${OTHER_USER_ID})`;
  });

  describe('Intent Classification (classifyIntent)', () => {
    it('classifies app help questions as app_help', () => {
      const q1 = classifyIntent('How do I change my shipping region?');
      expect(q1.intent).toBe('app_help');

      const q2 = classifyIntent('How do I undo an action?');
      expect(q2.intent).toBe('app_help');

      const q3 = classifyIntent('Who is Hank and how does he differ from Vee?');
      expect(q3.intent).toBe('app_help');

      const q4 = classifyIntent('What is Rig Passport and are serial numbers public?');
      expect(q4.intent).toBe('app_help');
    });

    it('classifies gear and maintenance questions as query', () => {
      const q1 = classifyIntent("When did I last change the PRS's strings?");
      expect(q1.intent).toBe('query');

      const q2 = classifyIntent('What is the tuning on my Custom 24?');
      expect(q2.intent).toBe('query');

      const q3 = classifyIntent('Show maintenance history for the PRS');
      expect(q3.intent).toBe('query');

      const q4 = classifyIntent('Any deals on my wants?');
      expect(q4.intent).toBe('query');
    });

    it('classifies maintenance commands and want creations as action', () => {
      const a1 = classifyIntent('Restrung the PRS with Elixir 9-42 today');
      expect(a1.intent).toBe('action');

      const a2 = classifyIntent("I'm looking for a Strymon Flint under £220 in the UK");
      expect(a2.intent).toBe('action');
    });

    it('classifies conversational or opinion queries as chat', () => {
      const c1 = classifyIntent('Should I buy a tube amp or a Quad Cortex?');
      expect(c1.intent).toBe('chat');

      const c2 = classifyIntent('What do you think of Klon Centaurs?');
      expect(c2.intent).toBe('chat');
    });
  });

  describe('App Help System & Normalised Question Caching (explain_app)', () => {
    beforeAll(() => {
      clearHelpCache();
    });

    it('answers documented help question and caches the result for 0-cost reuse', async () => {
      const question = 'How do I change my region?';
      const normalized = normalizeHelpQuestion(question);
      expect(normalized).toBe('how do i change my region');

      // First query (cache miss)
      const res1 = await answerAppHelp(TEST_USER_ID, question);
      expect(res1.cached).toBe(false);
      expect(res1.answer.toLowerCase()).toContain('setup');
      expect(res1.answer.toLowerCase()).toContain('shipping');

      // Second query with slight punctuation difference (cache hit)
      const res2 = await answerAppHelp(TEST_USER_ID, 'How do I change my region??!');
      expect(res2.cached).toBe(true);
      expect(res2.costUsd).toBe(0);
      expect(res2.answer).toBe(res1.answer);
    });

    it('answers Hank vs Vee question from help documentation', async () => {
      const res = await answerAppHelp(TEST_USER_ID, 'Who is Hank and who is Vee?');
      expect(res.answer).toContain('Hank');
      expect(res.answer).toContain('Vee');
      expect(res.answer).toContain('Backstage');
    });

    it('answers serial privacy question from help documentation', async () => {
      const res = await answerAppHelp(TEST_USER_ID, 'Are serial numbers public on the passport?');
      expect(res.answer.toLowerCase()).toContain('private by default');
    });

    it('refuses to make up answers for topics absent from help documentation', async () => {
      const res = await answerAppHelp(TEST_USER_ID, 'How do I bake sourdough bread?');
      expect(res.answer).toContain("I couldn't find information on that in the Ryff help guide");
    });
  });

  describe('Deterministic Rig Queries (query_rig)', () => {
    it("answers string change questions deterministically from user's real logs", async () => {
      const res = await queryRig({
        userId: TEST_USER_ID,
        gearRef: 'PRS',
        question: 'When did I last change strings on the PRS?',
      });

      expect(res.ok).toBe(true);
      expect(res.status).toBe('answered');
      expect(res.answer).toMatch(/2026-09-15|September 15|15 September/i);
      expect(res.answer.toLowerCase()).toContain('elixir');
      expect(res.gear?.id).toBe(prsId);
    });

    it('answers tuning inquiries from real rig_items record', async () => {
      const res = await queryRig({
        userId: TEST_USER_ID,
        gearRef: 'Blue Dream',
        question: 'What is the tuning on Blue Dream?',
      });

      expect(res.ok).toBe(true);
      expect(res.status).toBe('answered');
      expect(res.answer).toContain('Drop D');
    });

    it('detects ambiguous gear references and prompts user without guessing', async () => {
      const res = await queryRig({
        userId: TEST_USER_ID,
        gearRef: 'Strat',
        question: 'When was the Strat serviced?',
      });

      expect(res.ok).toBe(true);
      expect(res.status).toBe('ambiguous');
      expect(res.candidates?.length).toBe(2);
      const ids = res.candidates?.map((c) => c.id);
      expect(ids).toContain(strat1Id);
      expect(ids).toContain(strat2Id);
    });

    it('uses screen context activeGearId to answer for the active instrument', async () => {
      const res = await queryRig({
        userId: TEST_USER_ID,
        question: 'When did I change strings on this guitar?',
        activeGearId: String(prsId),
      });

      expect(res.ok).toBe(true);
      expect(res.status).toBe('answered');
      expect(res.gear?.id).toBe(prsId);
      expect(res.answer).toMatch(/2026-09-15|September 15|15 September/i);
    });
  });

  describe('Deals & Wants Queries (query_deals)', () => {
    it('summarises active wants and current deals matches', async () => {
      const res = await queryDeals({
        userId: TEST_USER_ID,
        question: 'Any deals on my wants?',
      });

      expect(res.ok).toBe(true);
      expect(res.status).toBe('answered');
      expect(res.wantsCount).toBeGreaterThan(0);
      expect(res.dealsCount).toBeGreaterThan(0);
      expect(res.answer).toContain('Soldano');
    });

    it('handles user with zero wants gracefully', async () => {
      const res = await queryDeals({
        userId: OTHER_USER_ID,
        question: 'Any deals for me?',
      });

      expect(res.ok).toBe(true);
      expect(res.status).toBe('no_wants');
      expect(res.answer).toContain("You don't have any items on your Wants list yet");
    });
  });

  describe('Quotas & Cost Logging Telemetry', () => {
    it('records assistant request token usage and calculated USD cost', async () => {
      const cost = await recordAssistantCost({
        userId: TEST_USER_ID,
        intent: 'query',
        toolName: 'query_rig',
        model: 'gemini-2.5-flash',
        inputTokens: 120,
        outputTokens: 40,
        costUsd: 0.000042,
      });

      expect(cost).toBe(0.000042);

      // Verify row exists in assistant_cost_logs
      const [logged] = await db`
        select intent, tool_name, model, input_tokens, output_tokens, cost_usd
        from assistant_cost_logs
        where user_id = ${TEST_USER_ID}
        order by id desc
        limit 1
      `;

      expect(logged.intent).toBe('query');
      expect(logged.tool_name).toBe('query_rig');
      expect(logged.input_tokens).toBe(120);
      expect(Number(logged.cost_usd)).toBeCloseTo(0.000042, 6);
    });

    it('enforces structured daily quota limit (50 requests/day)', async () => {
      // User is well under quota
      const check = await checkAssistantQuota(TEST_USER_ID, 'query');
      expect(check.allowed).toBe(true);
      expect(check.limit).toBe(50);
    });

    it('aggregates per-user daily assistant costs for Admin Command Centre', async () => {
      // Seed a few cost rows
      await recordAssistantCost({
        userId: TEST_USER_ID,
        intent: 'action',
        toolName: 'log_maintenance',
        model: 'gemini-2.5-flash',
        inputTokens: 250,
        outputTokens: 60,
        costUsd: 0.000075,
      });

      await recordAssistantCost({
        userId: TEST_USER_ID,
        intent: 'app_help',
        toolName: 'explain_app',
        model: 'gemini-2.5-flash',
        inputTokens: 180,
        outputTokens: 50,
        costUsd: 0.000057,
      });

      const summaries = await getDailyAssistantCostsByUser();
      expect(summaries.length).toBeGreaterThan(0);

      const userSummary = summaries.find((s) => s.userId === TEST_USER_ID);
      expect(userSummary).toBeDefined();
      expect(userSummary?.totalRequests).toBeGreaterThanOrEqual(3);
      expect(userSummary?.totalCostUsd).toBeGreaterThan(0);
      expect(userSummary?.actionCount).toBeGreaterThanOrEqual(1);
      expect(userSummary?.queryCount).toBeGreaterThanOrEqual(1);
      expect(userSummary?.helpCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Full Router Integration (routeCommand)', () => {
    it('routes app help query directly to explain_app without creating proposed writes', async () => {
      const actionsCountBefore = await db`select count(*) as c from assistant_actions where user_id = ${TEST_USER_ID}`;

      const res = await routeCommand({
        userId: TEST_USER_ID,
        message: 'How do I change my shipping region?',
      });

      expect(res.ok).toBe(true);
      expect(res.intent).toBe('app_help');
      expect(res.status).toBe('answered');
      expect(res.tool).toBe('explain_app');
      expect(res.answer).toContain('Setup');

      // CRITICAL: Read-only queries must propose ZERO assistant_actions
      const actionsCountAfter = await db`select count(*) as c from assistant_actions where user_id = ${TEST_USER_ID}`;
      expect(Number(actionsCountAfter[0].c)).toBe(Number(actionsCountBefore[0].c));
    });

    it('routes rig question directly to query_rig without creating proposed writes', async () => {
      const actionsCountBefore = await db`select count(*) as c from assistant_actions where user_id = ${TEST_USER_ID}`;

      const res = await routeCommand({
        userId: TEST_USER_ID,
        message: 'When did I last change strings on the PRS?',
      });

      expect(res.ok).toBe(true);
      expect(res.intent).toBe('query');
      expect(res.status).toBe('answered');
      expect(res.tool).toBe('query_rig');
      expect(res.answer).toMatch(/2026-09-15|September 15|15 September/i);

      const actionsCountAfter = await db`select count(*) as c from assistant_actions where user_id = ${TEST_USER_ID}`;
      expect(Number(actionsCountAfter[0].c)).toBe(Number(actionsCountBefore[0].c));
    });
  });
});
