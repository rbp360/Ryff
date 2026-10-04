import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { db } from '../src/lib/db';
import { confirmAssistantAction, undoAssistantAction } from '../src/lib/command/executor';
import { POST as confirmRoute } from '../src/app/api/command/confirm/route';
import { POST as undoRoute } from '../src/app/api/command/undo/route';
import { GET as activityRoute } from '../src/app/api/command/activity/route';
import { NextRequest } from 'next/server';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000003';
const OTHER_USER_ID = '00000000-0000-0000-0000-000000000004';

vi.mock('../src/lib/session', () => ({
  getSession: vi.fn(async () => ({
    userId: '00000000-0000-0000-0000-000000000003',
    email: 'step3_tester@ryff.local',
    cohort: 'cadre',
    isAdult: true,
  })),
}));

describe('Step 3: Confirmation, Undo & Activity History', { timeout: 30000 }, () => {
  let guitarId: number;
  let maintActionId: number;
  let wantActionId: number;

  beforeAll(async () => {
    // 1. Ensure test users exist
    await db`
      insert into users (id, email, is_adult, consented_at, cohort)
      values
        (${TEST_USER_ID}, 'step3_tester@ryff.local', true, now(), 'cadre'),
        (${OTHER_USER_ID}, 'other_tester@ryff.local', true, now(), 'cadre')
      on conflict (id) do nothing
    `;

    // 2. Clean previous test items
    await db`delete from rig_item_logs where rig_item_id in (select id from rig_items where user_id in (${TEST_USER_ID}, ${OTHER_USER_ID}))`;
    await db`delete from assistant_actions where user_id in (${TEST_USER_ID}, ${OTHER_USER_ID})`;
    await db`delete from rig_items where user_id in (${TEST_USER_ID}, ${OTHER_USER_ID})`;

    // 3. Create test guitar
    const [guitar] = await db`
      insert into rig_items (
        user_id, kind, brand, model, category, raw_text
      ) values (
        ${TEST_USER_ID}, 'own', 'PRS', 'Custom 24', 'guitar', 'PRS Custom 24'
      ) returning id
    `;
    guitarId = Number(guitar.id);

    // 4. Create proposed maintenance action in assistant_actions
    const [maintAction] = await db`
      insert into assistant_actions (
        user_id, source_text, tool_name, arguments, result, status
      ) values (
        ${TEST_USER_ID},
        'Restrung the PRS with 10-46 strings',
        'log_maintenance',
        ${JSON.stringify({
          gear_ref: 'PRS',
          resolved_gear_id: guitarId,
          event_type: 'strings',
          event_date: '2026-10-04',
          notes: 'Restrung with 10-46 strings',
          component: 'Strings',
        })},
        ${JSON.stringify({ title: 'Log: String change on PRS Custom 24', summary: 'Restrung with 10-46 strings' })},
        'proposed'
      ) returning id
    `;
    maintActionId = Number(maintAction.id);

    // 5. Create proposed want action in assistant_actions
    const [wantAction] = await db`
      insert into assistant_actions (
        user_id, source_text, tool_name, arguments, result, status
      ) values (
        ${TEST_USER_ID},
        'Looking for a Soldano SLO-100 in England',
        'add_want',
        ${JSON.stringify({
          item_text: 'Soldano SLO-100',
          region: 'UK_ONLY',
          max_price: 2000,
          currency: 'GBP',
          alert: true,
        })},
        ${JSON.stringify({ title: 'Add Want: Soldano SLO-100', summary: 'Tracking used listings' })},
        'proposed'
      ) returning id
    `;
    wantActionId = Number(wantAction.id);
  }, 30000);

  afterAll(async () => {
    await db`delete from rig_item_logs where rig_item_id in (select id from rig_items where user_id in (${TEST_USER_ID}, ${OTHER_USER_ID}))`;
    await db`delete from assistant_actions where user_id in (${TEST_USER_ID}, ${OTHER_USER_ID})`;
    await db`delete from rig_items where user_id in (${TEST_USER_ID}, ${OTHER_USER_ID})`;
    await db`delete from users where id in (${TEST_USER_ID}, ${OTHER_USER_ID})`;
  });

  describe('Confirm Action Execution (confirmAssistantAction)', () => {
    it('executes log_maintenance and populates undo_payload with source assistant', async () => {
      const logsBefore = await db`select count(*) as c from rig_item_logs where user_id = ${TEST_USER_ID}`;
      expect(Number(logsBefore[0].c)).toBe(0);

      const res = await confirmAssistantAction(TEST_USER_ID, maintActionId);
      expect(res.ok).toBe(true);
      expect(res.status).toBe('confirmed');
      expect(res.createdId).toBeDefined();

      // Verify row inserted in rig_item_logs with source = 'assistant'
      const logs = await db`
        select id, rig_item_id, event_type, source, event_date
        from rig_item_logs
        where id = ${res.createdId!} and user_id = ${TEST_USER_ID}
      `;
      expect(logs.length).toBe(1);
      expect(logs[0].source).toBe('assistant');
      expect(logs[0].event_type).toBe('strings');
      expect(Number(logs[0].rig_item_id)).toBe(guitarId);

      // Verify guitar last_restrung_at was updated
      const [updatedGuitar] = await db`select last_restrung_at from rig_items where id = ${guitarId}`;
      expect(updatedGuitar.last_restrung_at).toBeDefined();

      // Verify assistant_actions row state
      const [actionRow] = await db`
        select status, undo_payload from assistant_actions where id = ${maintActionId}
      `;
      const undoPayload = typeof actionRow.undo_payload === 'string' ? JSON.parse(actionRow.undo_payload) : actionRow.undo_payload;
      expect(actionRow.status).toBe('confirmed');
      expect(undoPayload.created_log_id).toBe(res.createdId);
      expect(undoPayload.was_string_change).toBe(true);
    });

    it('is idempotent: double-submitting confirm does not create duplicate rows', async () => {
      const logsCountBefore = await db`select count(*) as c from rig_item_logs where user_id = ${TEST_USER_ID}`;

      // Second confirm call
      const res = await confirmAssistantAction(TEST_USER_ID, maintActionId);
      expect(res.ok).toBe(true);
      expect(res.alreadyConfirmed).toBe(true);

      const logsCountAfter = await db`select count(*) as c from rig_item_logs where user_id = ${TEST_USER_ID}`;
      expect(Number(logsCountAfter[0].c)).toBe(Number(logsCountBefore[0].c));
    });

    it('executes add_want and creates kind want in rig_items', async () => {
      const res = await confirmAssistantAction(TEST_USER_ID, wantActionId);
      expect(res.ok).toBe(true);
      expect(res.status).toBe('confirmed');
      expect(res.createdId).toBeDefined();

      // Verify item inserted into rig_items with kind = 'want'
      const wants = await db`
        select id, raw_text, kind, budget_gbp, alert, currency
        from rig_items
        where id = ${res.createdId!} and user_id = ${TEST_USER_ID}
      `;
      expect(wants.length).toBe(1);
      expect(wants[0].kind).toBe('want');
      expect(wants[0].budget_gbp).toBe(2000);
      expect(wants[0].alert).toBe(true);
      expect(wants[0].currency).toBe('GBP');

      // Verify assistant_actions undo_payload
      const [actionRow] = await db`
        select status, undo_payload from assistant_actions where id = ${wantActionId}
      `;
      const undoPayload = typeof actionRow.undo_payload === 'string' ? JSON.parse(actionRow.undo_payload) : actionRow.undo_payload;
      expect(actionRow.status).toBe('confirmed');
      expect(undoPayload.created_item_id).toBe(res.createdId);
    });
  });

  describe('Undo Action Execution (undoAssistantAction)', () => {
    it('reverses log_maintenance: removes log entry and sets status undone', async () => {
      const [actionBefore] = await db`select undo_payload from assistant_actions where id = ${maintActionId}`;
      const payloadBefore = typeof actionBefore.undo_payload === 'string' ? JSON.parse(actionBefore.undo_payload) : actionBefore.undo_payload;
      const createdLogId = payloadBefore.created_log_id;

      const res = await undoAssistantAction(TEST_USER_ID, maintActionId);
      expect(res.ok).toBe(true);
      expect(res.status).toBe('undone');

      // Verify log was deleted from rig_item_logs
      const logs = await db`select id from rig_item_logs where id = ${createdLogId}`;
      expect(logs.length).toBe(0);

      // Verify assistant_actions status is 'undone'
      const [actionAfter] = await db`select status from assistant_actions where id = ${maintActionId}`;
      expect(actionAfter.status).toBe('undone');
    });

    it('reverses add_want: removes want item and sets status undone', async () => {
      const [actionBefore] = await db`select undo_payload from assistant_actions where id = ${wantActionId}`;
      const payloadBefore = typeof actionBefore.undo_payload === 'string' ? JSON.parse(actionBefore.undo_payload) : actionBefore.undo_payload;
      const createdItemId = payloadBefore.created_item_id;

      const res = await undoAssistantAction(TEST_USER_ID, wantActionId);
      expect(res.ok).toBe(true);
      expect(res.status).toBe('undone');

      // Verify item was deleted from rig_items
      const items = await db`select id from rig_items where id = ${createdItemId}`;
      expect(items.length).toBe(0);

      // Verify assistant_actions status is 'undone'
      const [actionAfter] = await db`select status from assistant_actions where id = ${wantActionId}`;
      expect(actionAfter.status).toBe('undone');
    });

    it('is idempotent: calling undo a second time succeeds without error', async () => {
      const res = await undoAssistantAction(TEST_USER_ID, maintActionId);
      expect(res.ok).toBe(true);
      expect(res.alreadyUndone).toBe(true);
    });
  });

  describe('API Routes Integration', () => {
    it('POST /api/command/confirm confirms multiple proposals in batch', async () => {
      // Create two proposed actions for batch confirmation
      const [a1] = await db`
        insert into assistant_actions (
          user_id, source_text, tool_name, arguments, status
        ) values (
          ${TEST_USER_ID},
          'Adjusted bridge saddles',
          'log_maintenance',
          ${JSON.stringify({
            gear_ref: 'PRS',
            resolved_gear_id: guitarId,
            event_type: 'hardware',
            notes: 'Adjusted bridge saddles',
          })},
          'proposed'
        ) returning id
      `;

      const [a2] = await db`
        insert into assistant_actions (
          user_id, source_text, tool_name, arguments, status
        ) values (
          ${TEST_USER_ID},
          'Looking for a Strymon Flint',
          'add_want',
          ${JSON.stringify({
            item_text: 'Strymon Flint',
            max_price: 250,
          })},
          'proposed'
        ) returning id
      `;

      const req = new NextRequest('http://localhost:3000/api/command/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionIds: [Number(a1.id), Number(a2.id)],
        }),
      });

      const res = await confirmRoute(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.confirmed.length).toBe(2);
      expect(data.confirmed[0].status).toBe('confirmed');
      expect(data.confirmed[1].status).toBe('confirmed');

      // Undo one via POST /api/command/undo
      const undoReq = new NextRequest('http://localhost:3000/api/command/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: Number(a2.id),
        }),
      });

      const undoRes = await undoRoute(undoReq);
      expect(undoRes.status).toBe(200);
      const undoData = await undoRes.json();
      expect(undoData.ok).toBe(true);
      expect(undoData.status).toBe('undone');
    });

    it('GET /api/command/activity returns recent actions with timestamps and statuses', async () => {
      const req = new NextRequest('http://localhost:3000/api/command/activity?limit=5');
      const res = await activityRoute(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(Array.isArray(data.activity)).toBe(true);
      expect(data.activity.length).toBeGreaterThan(0);
      expect(data.activity[0].source_text).toBeDefined();
      expect(data.activity[0].status).toBeDefined();
    });

    it('enforces authorization: user cannot confirm or undo actions of another user', async () => {
      // Create action owned by OTHER_USER_ID
      const [otherAction] = await db`
        insert into assistant_actions (
          user_id, source_text, tool_name, arguments, status
        ) values (
          ${OTHER_USER_ID},
          'Private action',
          'add_want',
          ${JSON.stringify({ item_text: 'Gibson Les Paul' })},
          'proposed'
        ) returning id
      `;

      const req = new NextRequest('http://localhost:3000/api/command/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId: Number(otherAction.id) }),
      });

      const res = await confirmRoute(req);
      expect(res.status).toBe(500); // Throws unauthorized/not found error
    });
  });
});
