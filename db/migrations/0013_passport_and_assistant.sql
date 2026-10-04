-- Migration 0013: Passport Rename, Assistant Actions & Schema Groundwork

-- 1. Gear items (rig_items) table enhancements
alter table rig_items add column if not exists serial_number text;
alter table rig_items add column if not exists serial_visible boolean not null default false;
alter table rig_items add column if not exists alert boolean not null default true;
alter table rig_items add column if not exists currency text default 'GBP';

-- 2. Gear logs (rig_item_logs) source and expanded event_type support
alter table rig_item_logs add column if not exists source text not null default 'live' check (source in ('live', 'voice', 'assistant', 'imported'));

-- Expand event_type check constraint to safely accommodate all granular and legacy event types
alter table rig_item_logs drop constraint if exists rig_item_logs_event_type_check;
alter table rig_item_logs add constraint rig_item_logs_event_type_check 
  check (event_type in ('strings', 'string_change', 'setup', 'fret_work', 'electronics', 'pickups', 'hardware', 'repair', 'valve_change', 'modification', 'maintenance', 'note', 'general', 'other'));

-- Backfill source column from existing logged_via where applicable
update rig_item_logs set source = 'voice' where logged_via = 'audio';
update rig_item_logs set source = 'imported' where logged_via = 'ai_import';
update rig_item_logs set source = 'live' where source is null or source not in ('voice', 'imported');

-- 3. Assistant actions table for command layer proposal/confirmation/undo
create table if not exists assistant_actions (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  source_text text not null,
  tool_name text not null,
  arguments jsonb not null default '{}',
  result jsonb,
  status text not null default 'proposed' check (status in ('proposed', 'confirmed', 'rejected', 'undone')),
  undo_payload jsonb,
  batch_id uuid
);

create index if not exists assistant_actions_user_idx on assistant_actions(user_id, created_at desc);
create index if not exists assistant_actions_status_idx on assistant_actions(status);

-- 4. User preferences: command input mode
alter table users add column if not exists command_input_mode text not null default 'text_and_voice' check (command_input_mode in ('text_and_voice', 'text_only', 'off'));
