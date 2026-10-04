import { db } from '../db';
import { formatGearTitle } from '../gear-utils';
import {
  formatEventType,
  formatCurrency,
  LogMaintenanceArgs,
  AddWantArgs,
  SetPreferenceArgs,
  validateAndNormalizePreference,
} from './tools';
import { parseGearLineWithRigistry } from '../rigistry-parser';
import { getUserPreferences, updateUserPreferences } from '../personalization';
import { computeAndUpdateRestringInterval } from './intervals';

export interface ConfirmActionResult {
  ok: boolean;
  actionId: number;
  status: 'confirmed';
  alreadyConfirmed?: boolean;
  tool: string;
  createdId?: number;
  summary: string;
}

export interface UndoActionResult {
  ok: boolean;
  actionId: number;
  status: 'undone';
  alreadyUndone?: boolean;
  tool: string;
  summary: string;
}

export interface AssistantActivityItem {
  id: number;
  source_text: string;
  tool_name: string;
  arguments: any;
  result: any;
  status: 'proposed' | 'confirmed' | 'rejected' | 'undone';
  created_at: string;
  undo_payload?: any;
}

/**
 * Confirms and executes an assistant_actions row.
 * Idempotent: calling confirm on an already confirmed action returns ok without re-executing.
 */
export async function confirmAssistantAction(
  userId: string,
  actionId: number,
  edits?: Partial<LogMaintenanceArgs | AddWantArgs>
): Promise<ConfirmActionResult> {
  // 1. Fetch action with user ownership check
  const [action] = await db`
    select id, user_id, source_text, tool_name, arguments, result, status, undo_payload
    from assistant_actions
    where id = ${actionId} and user_id = ${userId}
    limit 1
  `;

  if (!action) {
    throw new Error('Action not found or unauthorized');
  }

  // Idempotency: if already confirmed, do not re-insert or double-write
  if (action.status === 'confirmed') {
    return {
      ok: true,
      actionId: Number(action.id),
      status: 'confirmed',
      alreadyConfirmed: true,
      tool: action.tool_name,
      summary: action.result?.summary || 'Action already confirmed',
    };
  }

  const rawArgs = typeof action.arguments === 'string' ? JSON.parse(action.arguments) : action.arguments;
  const mergedArgs = { ...rawArgs, ...(edits || {}) };
  const todayIso = new Date().toISOString().split('T')[0];

  if (action.tool_name === 'log_maintenance') {
    const gearId = mergedArgs.resolved_gear_id || mergedArgs.gear_id;
    if (!gearId) {
      throw new Error('Missing target gear for maintenance action');
    }

    // Verify gear belongs to user
    const [gear] = await db`
      select id, brand, model, raw_text, last_restrung_at
      from rig_items
      where id = ${gearId} and user_id = ${userId}
      limit 1
    `;

    if (!gear) {
      throw new Error('Gear item not found or does not belong to user');
    }

    const gearName = formatGearTitle(gear.brand, gear.model, gear.raw_text);
    const eventType = mergedArgs.event_type || 'other';
    const eventDate = mergedArgs.event_date || todayIso;
    const title = `Log: ${formatEventType(eventType)} on ${gearName}`;
    const description = mergedArgs.notes || formatEventType(eventType);

    // Insert into rig_item_logs with source = 'assistant'
    const [insertedLog] = await db`
      insert into rig_item_logs (
        rig_item_id, user_id, event_type, title, description,
        component, original_part, metadata, logged_via, audio_transcript, event_date, source
      ) values (
        ${gearId},
        ${userId},
        ${eventType},
        ${title},
        ${description},
        ${mergedArgs.component || null},
        ${mergedArgs.original_part || null},
        ${JSON.stringify({ source: 'assistant', action_id: actionId })},
        'text_prompt',
        ${action.source_text},
        ${eventDate},
        'assistant'
      ) returning id
    `;

    const logId = Number(insertedLog.id);

    // If string change, update last_restrung_at on rig_items and recompute interval
    if (eventType === 'strings') {
      await db`
        update rig_items set
          last_restrung_at = ${eventDate}::timestamptz,
          updated_at = now()
        where id = ${gearId} and user_id = ${userId}
      `;
      await computeAndUpdateRestringInterval(userId, Number(gearId)).catch((err) => {
        console.warn('[Executor] Restring interval update warning:', err);
      });
    }

    const undoPayload = {
      created_log_id: logId,
      gear_id: Number(gearId),
      previous_last_restrung_at: gear.last_restrung_at,
      was_string_change: eventType === 'strings',
    };

    const summary = `${description} on ${gearName} (${eventDate})`;

    await db`
      update assistant_actions set
        status = 'confirmed',
        arguments = ${JSON.stringify(mergedArgs)},
        undo_payload = ${JSON.stringify(undoPayload)},
        result = ${JSON.stringify({ ...action.result, title, summary, log_id: logId })}
      where id = ${actionId} and user_id = ${userId}
    `;

    return {
      ok: true,
      actionId: Number(action.id),
      status: 'confirmed',
      tool: 'log_maintenance',
      createdId: logId,
      summary,
    };
  } else if (action.tool_name === 'add_want') {
    const itemText = mergedArgs.item_text || 'Wanted Gear';
    const parsed = await parseGearLineWithRigistry(itemText);

    const maxPrice = mergedArgs.max_price ? Math.round(Number(mergedArgs.max_price)) : null;
    const currency = mergedArgs.currency || 'GBP';
    const alert = mergedArgs.alert !== false;

    // Insert into rig_items with kind = 'want'
    const [insertedWant] = await db`
      insert into rig_items (
        user_id, raw_text, brand, model, category, kind, budget_gbp, alert, currency, want_key
      ) values (
        ${userId},
        ${itemText},
        ${parsed.brand || null},
        ${parsed.model || null},
        ${parsed.category || 'guitar'},
        'want',
        ${maxPrice},
        ${alert},
        ${currency},
        ${parsed.want_key || null}
      ) returning id
    `;

    const wantId = Number(insertedWant.id);
    const undoPayload = {
      created_item_id: wantId,
    };

    const priceText = maxPrice ? ` · Max ${formatCurrency(maxPrice, currency)}` : '';
    const regionText = mergedArgs.region ? ` · ${String(mergedArgs.region).replace('_', ' ')}` : '';
    const summary = `Tracking used listings for ${itemText}${priceText}${regionText}`;

    await db`
      update assistant_actions set
        status = 'confirmed',
        arguments = ${JSON.stringify(mergedArgs)},
        undo_payload = ${JSON.stringify(undoPayload)},
        result = ${JSON.stringify({ ...action.result, summary, want_id: wantId })}
      where id = ${actionId} and user_id = ${userId}
    `;

    return {
      ok: true,
      actionId: Number(action.id),
      status: 'confirmed',
      tool: 'add_want',
      createdId: wantId,
      summary,
    };
  } else if (action.tool_name === 'set_preference') {
    const rawKey = mergedArgs.key;
    const rawValue = mergedArgs.value;

    const validated = validateAndNormalizePreference(rawKey, rawValue);
    const currentPrefs = await getUserPreferences(userId);
    const previousValue = currentPrefs[validated.key];

    await updateUserPreferences(userId, {
      [validated.key]: validated.normalizedValue,
    });

    let displayKey: string = validated.key;
    let displayVal: string = Array.isArray(validated.normalizedValue)
      ? validated.normalizedValue.join(', ')
      : String(validated.normalizedValue);

    if (validated.key === 'reverbRegion') {
      displayKey = 'Reverb Region';
      displayVal = validated.normalizedValue.replace(/_/g, ' ');
    } else if (validated.key === 'personality') {
      displayKey = 'Assistant Personality';
    } else if (validated.key === 'followedBrands') {
      displayKey = 'Followed Brands';
    } else if (validated.key === 'favoritePlayers') {
      displayKey = 'Favorite Players';
    }

    const title = `Set Preference: ${displayKey}`;
    const summary = `${displayKey} updated to ${displayVal}`;

    const undoPayload = {
      key: validated.key,
      previous_value: previousValue,
    };

    await db`
      update assistant_actions set
        status = 'confirmed',
        arguments = ${JSON.stringify({ key: validated.key, value: validated.normalizedValue })},
        undo_payload = ${JSON.stringify(undoPayload)},
        result = ${JSON.stringify({ ...action.result, title, summary, key: validated.key, value: validated.normalizedValue })}
      where id = ${actionId} and user_id = ${userId}
    `;

    return {
      ok: true,
      actionId: Number(action.id),
      status: 'confirmed',
      tool: 'set_preference',
      summary,
    };
  }

  throw new Error(`Unknown tool name: ${action.tool_name}`);
}

/**
 * Undoes a confirmed assistant action using its undo_payload.
 * Idempotent: undoing an already undone action succeeds without error.
 */
export async function undoAssistantAction(
  userId: string,
  actionId: number
): Promise<UndoActionResult> {
  const [action] = await db`
    select id, user_id, tool_name, status, undo_payload, result
    from assistant_actions
    where id = ${actionId} and user_id = ${userId}
    limit 1
  `;

  if (!action) {
    throw new Error('Action not found or unauthorized');
  }

  // Idempotency: if already undone, return success
  if (action.status === 'undone') {
    return {
      ok: true,
      actionId: Number(action.id),
      status: 'undone',
      alreadyUndone: true,
      tool: action.tool_name,
      summary: 'Action was already reversed',
    };
  }

  if (action.status !== 'confirmed') {
    throw new Error(`Cannot undo action with status '${action.status}'`);
  }

  const payload = typeof action.undo_payload === 'string' ? JSON.parse(action.undo_payload) : action.undo_payload;
  if (!payload) {
    throw new Error('Missing undo payload for confirmed action');
  }

  if (action.tool_name === 'log_maintenance') {
    if (payload.created_log_id) {
      await db`
        delete from rig_item_logs
        where id = ${payload.created_log_id} and user_id = ${userId}
      `;
    }

    // Restore last_restrung_at if this was a string change and recompute interval
    if (payload.was_string_change && payload.gear_id) {
      await db`
        update rig_items set
          last_restrung_at = ${payload.previous_last_restrung_at ? new Date(payload.previous_last_restrung_at).toISOString() : null},
          updated_at = now()
        where id = ${payload.gear_id} and user_id = ${userId}
      `;
      await computeAndUpdateRestringInterval(userId, payload.gear_id).catch(() => {});
    }

    await db`
      update assistant_actions set
        status = 'undone'
      where id = ${actionId} and user_id = ${userId}
    `;

    return {
      ok: true,
      actionId: Number(action.id),
      status: 'undone',
      tool: 'log_maintenance',
      summary: 'Maintenance log entry removed',
    };
  } else if (action.tool_name === 'add_want') {
    if (payload.created_item_id) {
      await db`
        delete from rig_items
        where id = ${payload.created_item_id} and user_id = ${userId} and kind = 'want'
      `;
    }

    await db`
      update assistant_actions set
        status = 'undone'
      where id = ${actionId} and user_id = ${userId}
    `;

    return {
      ok: true,
      actionId: Number(action.id),
      status: 'undone',
      tool: 'add_want',
      summary: 'Want list entry removed',
    };
  } else if (action.tool_name === 'set_preference') {
    if (payload.key && payload.previous_value !== undefined) {
      await updateUserPreferences(userId, {
        [payload.key]: payload.previous_value,
      });
    }

    await db`
      update assistant_actions set
        status = 'undone'
      where id = ${actionId} and user_id = ${userId}
    `;

    return {
      ok: true,
      actionId: Number(action.id),
      status: 'undone',
      tool: 'set_preference',
      summary: `Restored previous ${payload.key} preference`,
    };
  }

  throw new Error(`Unknown tool name: ${action.tool_name}`);
}

/**
 * Rejects / skips a proposed assistant action
 */
export async function skipAssistantAction(userId: string, actionId: number): Promise<{ ok: boolean; actionId: number; status: 'rejected' }> {
  const [action] = await db`
    select id from assistant_actions
    where id = ${actionId} and user_id = ${userId}
    limit 1
  `;

  if (!action) {
    throw new Error('Action not found or unauthorized');
  }

  await db`
    update assistant_actions set
      status = 'rejected'
    where id = ${actionId} and user_id = ${userId}
  `;

  return { ok: true, actionId, status: 'rejected' };
}

/**
 * Retrieves the user's assistant action history
 */
export async function getAssistantActivity(userId: string, limit = 20): Promise<AssistantActivityItem[]> {
  const rows = await db`
    select id, source_text, tool_name, arguments, result, status, undo_payload, created_at
    from assistant_actions
    where user_id = ${userId}
    order by created_at desc
    limit ${limit}
  `;

  return rows.map((r: any) => ({
    id: Number(r.id),
    source_text: r.source_text,
    tool_name: r.tool_name,
    arguments: typeof r.arguments === 'string' ? JSON.parse(r.arguments) : r.arguments,
    result: typeof r.result === 'string' ? JSON.parse(r.result) : r.result,
    status: r.status,
    created_at: r.created_at,
    undo_payload: r.undo_payload,
  }));
}
