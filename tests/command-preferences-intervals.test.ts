import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../src/lib/db';
import {
  validateAndNormalizePreference,
  ALLOWED_PREFERENCE_KEYS,
} from '../src/lib/command/tools';
import { confirmAssistantAction, undoAssistantAction } from '../src/lib/command/executor';
import { getUserPreferences, updateUserPreferences } from '../src/lib/personalization';
import {
  computeAndUpdateRestringInterval,
  overrideRestringInterval,
  getGearRestringHealth,
  DEFAULT_RESTRING_INTERVAL_DAYS,
} from '../src/lib/command/intervals';

const PREF_USER_ID = '00000000-0000-0000-0000-000000000066';

describe('Step 5: Preferences Tool & Restring Interval Learning', { timeout: 30000 }, () => {
  let testGearId: number;

  beforeAll(async () => {
    // 1. Ensure test user exists
    await db`
      insert into users (id, email, cohort, uk_resident, is_adult, consented_at, personality, reverb_region)
      values (${PREF_USER_ID}, 'pref-test@ryff.app', 'cadre', true, true, now(), 'hank', 'SHIPS_TO_UK')
      on conflict (id) do nothing
    `;

    // 2. Clean previous test data
    await db`delete from assistant_actions where user_id = ${PREF_USER_ID}`;
    await db`delete from rig_item_logs where user_id = ${PREF_USER_ID}`;
    await db`delete from rig_items where user_id = ${PREF_USER_ID}`;

    // 3. Create test guitar
    const [gear] = await db`
      insert into rig_items (
        user_id, raw_text, brand, model, category, kind, last_restrung_at
      ) values (
        ${PREF_USER_ID}, 'PRS Custom 24', 'PRS', 'Custom 24', 'guitars', 'own', '2026-06-01'
      ) returning id
    `;
    testGearId = Number(gear.id);
  }, 30000);

  afterAll(async () => {
    await db`delete from assistant_actions where user_id = ${PREF_USER_ID}`;
    await db`delete from rig_item_logs where user_id = ${PREF_USER_ID}`;
    await db`delete from rig_items where user_id = ${PREF_USER_ID}`;
    await db`delete from users where id = ${PREF_USER_ID}`;
  });

  describe('Preference Validation & Allow-List', () => {
    it('allows only keys from the ALLOWED_PREFERENCE_KEYS allow-list', () => {
      expect(ALLOWED_PREFERENCE_KEYS).toContain('reverbRegion');
      expect(ALLOWED_PREFERENCE_KEYS).toContain('personality');
      expect(ALLOWED_PREFERENCE_KEYS).toContain('followedBrands');
      expect(ALLOWED_PREFERENCE_KEYS).toContain('favoritePlayers');

      // Rejects unallowed key
      expect(() => {
        validateAndNormalizePreference('role', 'admin');
      }).toThrow(/not allowed/);

      expect(() => {
        validateAndNormalizePreference('isAdult', 'true');
      }).toThrow(/not allowed/);
    });

    it('validates and normalizes reverbRegion values', () => {
      const resUk = validateAndNormalizePreference('reverbRegion', 'England');
      expect(resUk.normalizedValue).toBe('UK_ONLY');

      const resUs = validateAndNormalizePreference('reverbRegion', 'US Only');
      expect(resUs.normalizedValue).toBe('US_ONLY');

      const resWorld = validateAndNormalizePreference('reverbRegion', 'worldwide');
      expect(resWorld.normalizedValue).toBe('WORLDWIDE');

      expect(() => {
        validateAndNormalizePreference('reverbRegion', 'Mars');
      }).toThrow(/Invalid reverb region/);
    });

    it('validates personality enums', () => {
      const resVee = validateAndNormalizePreference('personality', 'vee');
      expect(resVee.normalizedValue).toBe('vee');

      const resBlunt = validateAndNormalizePreference('personality', 'blunt');
      expect(resBlunt.normalizedValue).toBe('blunt');

      expect(() => {
        validateAndNormalizePreference('personality', 'hyperactive');
      }).toThrow(/Invalid personality/);
    });

    it('validates followedBrands and favoritePlayers as cleaned string arrays', () => {
      const brands = validateAndNormalizePreference('followedBrands', ['Marshall', 'Gibson', '']);
      expect(brands.normalizedValue).toEqual(['Marshall', 'Gibson']);

      const players = validateAndNormalizePreference('favoritePlayers', 'Jimi Hendrix, Stevie Ray Vaughan');
      expect(players.normalizedValue).toContain('Jimi Hendrix');
      expect(players.normalizedValue).toContain('Stevie Ray Vaughan');
    });
  });

  describe('Preference Action Confirmation & 1-Tap Undo', () => {
    it('confirms a preference proposal and updates database preferences', async () => {
      // 1. Initial state
      await updateUserPreferences(PREF_USER_ID, {
        reverbRegion: 'SHIPS_TO_UK',
        personality: 'hank',
      });

      // 2. Insert staged proposal
      const [proposal] = await db`
        insert into assistant_actions (
          user_id, source_text, tool_name, arguments, status
        ) values (
          ${PREF_USER_ID},
          'Only show me UK listings',
          'set_preference',
          ${JSON.stringify({ key: 'reverbRegion', value: 'UK_ONLY' })},
          'proposed'
        ) returning id
      `;

      const actionId = Number(proposal.id);

      // 3. Confirm proposal
      const res = await confirmAssistantAction(PREF_USER_ID, actionId);
      expect(res.ok).toBe(true);
      expect(res.status).toBe('confirmed');

      // 4. Verify DB was updated
      const prefs = await getUserPreferences(PREF_USER_ID);
      expect(prefs.reverbRegion).toBe('UK_ONLY');

      // 5. Undo proposal
      const undoRes = await undoAssistantAction(PREF_USER_ID, actionId);
      expect(undoRes.ok).toBe(true);
      expect(undoRes.status).toBe('undone');

      // 6. Verify preference was reverted to previous value
      const revertedPrefs = await getUserPreferences(PREF_USER_ID);
      expect(revertedPrefs.reverbRegion).toBe('SHIPS_TO_UK');
    });

    it('confirms personality preference change and supports undo', async () => {
      // Initial state
      await updateUserPreferences(PREF_USER_ID, { personality: 'hank' });

      const [proposal] = await db`
        insert into assistant_actions (
          user_id, source_text, tool_name, arguments, status
        ) values (
          ${PREF_USER_ID},
          'Make the bot blunt',
          'set_preference',
          ${JSON.stringify({ key: 'personality', value: 'blunt' })},
          'proposed'
        ) returning id
      `;

      const actionId = Number(proposal.id);

      // Confirm
      await confirmAssistantAction(PREF_USER_ID, actionId);
      const updatedPrefs = await getUserPreferences(PREF_USER_ID);
      expect(updatedPrefs.personality).toBe('blunt');

      // Undo
      await undoAssistantAction(PREF_USER_ID, actionId);
      const restoredPrefs = await getUserPreferences(PREF_USER_ID);
      expect(restoredPrefs.personality).toBe('hank');
    });
  });

  describe('Habit Learning for Restring Intervals', () => {
    it('falls back to default interval (60 days) when fewer than 3 events exist', async () => {
      // Clean logs for test gear
      await db`delete from rig_item_logs where rig_item_id = ${testGearId}`;

      // Insert 1 log
      await db`
        insert into rig_item_logs (
          rig_item_id, user_id, event_type, event_date, title, source
        ) values (
          ${testGearId}, ${PREF_USER_ID}, 'strings', '2026-01-01', 'Log: Strings', 'assistant'
        )
      `;

      const res = await computeAndUpdateRestringInterval(PREF_USER_ID, testGearId);
      expect(res.isLearned).toBe(false);
      expect(res.intervalDays).toBe(DEFAULT_RESTRING_INTERVAL_DAYS);
    });

    it('computes median interval when 3 or more string change events exist', async () => {
      await db`delete from rig_item_logs where rig_item_id = ${testGearId}`;

      // Insert 4 chronological events with intervals:
      // event 1: 2026-01-01
      // event 2: 2026-02-10 (40 days)
      // event 3: 2026-03-22 (40 days)
      // event 4: 2026-05-11 (50 days)
      // Deltas: [40, 40, 50]. Median is 40 days.
      await db`
        insert into rig_item_logs (rig_item_id, user_id, event_type, event_date, title, source)
        values
          (${testGearId}, ${PREF_USER_ID}, 'strings', '2026-01-01', 'Change 1', 'assistant'),
          (${testGearId}, ${PREF_USER_ID}, 'strings', '2026-02-10', 'Change 2', 'assistant'),
          (${testGearId}, ${PREF_USER_ID}, 'strings', '2026-03-22', 'Change 3', 'assistant'),
          (${testGearId}, ${PREF_USER_ID}, 'strings', '2026-05-11', 'Change 4', 'assistant')
      `;

      const learned = await computeAndUpdateRestringInterval(PREF_USER_ID, testGearId);
      expect(learned.isLearned).toBe(true);
      expect(learned.intervalDays).toBe(40);
      expect(learned.basis).toBe('based on your last 4 changes');

      // Verify stored in rig_items
      const [item] = await db`
        select restring_interval_days, restring_interval_basis
        from rig_items
        where id = ${testGearId}
      `;
      expect(item.restring_interval_days).toBe(40);
      expect(item.restring_interval_basis).toBe('based on your last 4 changes');
    });

    it('allows manual override of restring interval', async () => {
      const override = await overrideRestringInterval(PREF_USER_ID, testGearId, 30);
      expect(override.intervalDays).toBe(30);
      expect(override.basis).toBe('manual override');

      const [item] = await db`
        select restring_interval_days, restring_interval_basis
        from rig_items
        where id = ${testGearId}
      `;
      expect(item.restring_interval_days).toBe(30);
      expect(item.restring_interval_basis).toBe('manual override');
    });

    it('getGearRestringHealth calculates health accurately based on learned interval', () => {
      // 10 days ago with 40-day interval -> good
      const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
      const healthGood = getGearRestringHealth(tenDaysAgo, 40, 'based on your last 4 changes');
      expect(healthGood.isOverdue).toBe(false);
      expect(healthGood.basis).toBe('based on your last 4 changes');

      // 45 days ago with 40-day interval -> overdue!
      const fortyFiveDaysAgo = new Date(Date.now() - 45 * 86400000).toISOString();
      const healthOverdue = getGearRestringHealth(fortyFiveDaysAgo, 40, 'based on your last 4 changes');
      expect(healthOverdue.isOverdue).toBe(true);
      expect(healthOverdue.status).toBe('overdue');
      expect(healthOverdue.text).toContain('Overdue');
      expect(healthOverdue.text).toContain('based on your last 4 changes');
    });
  });
});
