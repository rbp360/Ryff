import { describe, it, expect } from 'vitest';
import { db } from '../src/lib/db';

describe('Step 0: Passport Schema & Groundwork', { timeout: 30000 }, () => {
  it('has serial_visible and serial_number on rig_items', async () => {
    const cols = await db`
      select column_name, data_type, column_default
      from information_schema.columns
      where table_name = 'rig_items' and column_name in ('serial_number', 'serial_visible', 'alert', 'currency')
    `;

    const map = new Map(cols.map((c: Record<string, unknown>) => [c.column_name as string, c]));
    expect(map.has('serial_number')).toBe(true);
    expect(map.has('serial_visible')).toBe(true);
    expect(String(map.get('serial_visible')?.column_default)).toContain('false');
    expect(map.has('alert')).toBe(true);
    expect(map.has('currency')).toBe(true);
  });

  it('has source on rig_item_logs with default live', async () => {
    const cols = await db`
      select column_name, data_type, column_default
      from information_schema.columns
      where table_name = 'rig_item_logs' and column_name = 'source'
    `;

    expect(cols.length).toBe(1);
    expect(cols[0].column_name).toBe('source');
    expect(cols[0].column_default).toContain('live');
  });

  it('has assistant_actions table with expected schema', async () => {
    const cols = await db`
      select column_name, data_type
      from information_schema.columns
      where table_name = 'assistant_actions'
    `;

    const colNames = new Set(cols.map((c: Record<string, unknown>) => c.column_name as string));
    expect(colNames.has('id')).toBe(true);
    expect(colNames.has('user_id')).toBe(true);
    expect(colNames.has('source_text')).toBe(true);
    expect(colNames.has('tool_name')).toBe(true);
    expect(colNames.has('arguments')).toBe(true);
    expect(colNames.has('result')).toBe(true);
    expect(colNames.has('status')).toBe(true);
    expect(colNames.has('undo_payload')).toBe(true);
    expect(colNames.has('batch_id')).toBe(true);
  });

  it('has command_input_mode on users table', async () => {
    const cols = await db`
      select column_name, column_default
      from information_schema.columns
      where table_name = 'users' and column_name = 'command_input_mode'
    `;

    expect(cols.length).toBe(1);
    expect(cols[0].column_default).toContain('text_and_voice');
  });

  it('has personality on users table and restring intervals on rig_items', async () => {
    const userCols = await db`
      select column_name, column_default
      from information_schema.columns
      where table_name = 'users' and column_name = 'personality'
    `;
    expect(userCols.length).toBe(1);
    expect(userCols[0].column_default).toContain('hank');

    const rigCols = await db`
      select column_name
      from information_schema.columns
      where table_name = 'rig_items' and column_name in ('restring_interval_days', 'restring_interval_basis')
    `;
    const names = rigCols.map((c: Record<string, unknown>) => c.column_name as string);
    expect(names).toContain('restring_interval_days');
    expect(names).toContain('restring_interval_basis');
  });
});
