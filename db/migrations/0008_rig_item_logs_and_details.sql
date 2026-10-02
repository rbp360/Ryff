-- Rig Item Details & Maintenance / Modification Event Logs
-- Extends rig_items with gear tracking details and creates rig_item_logs

alter table rig_items add column if not exists purchase_date text;
alter table rig_items add column if not exists purchase_price text;
alter table rig_items add column if not exists year_manufacture text;
alter table rig_items add column if not exists condition text;
alter table rig_items add column if not exists current_strings text;
alter table rig_items add column if not exists last_restrung_at timestamptz;
alter table rig_items add column if not exists pickups_summary text;
alter table rig_items add column if not exists modifications_summary text;
alter table rig_items add column if not exists valves_summary text;
alter table rig_items add column if not exists last_valves_changed_at timestamptz;
alter table rig_items add column if not exists last_serviced_at timestamptz;
alter table rig_items add column if not exists updated_at timestamptz not null default now();

create table if not exists rig_item_logs (
  id bigserial primary key,
  rig_item_id bigint not null references rig_items(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  event_type text not null default 'general' check (event_type in ('string_change', 'modification', 'maintenance', 'repair', 'valve_change', 'setup', 'note', 'general')),
  title text not null,
  description text,
  component text,
  original_part text,
  metadata jsonb not null default '{}',
  logged_via text not null default 'manual' check (logged_via in ('manual', 'audio', 'text_prompt', 'ai_import')),
  audio_transcript text,
  event_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists rig_item_logs_item_idx on rig_item_logs(rig_item_id, event_date desc, created_at desc);
create index if not exists rig_item_logs_user_idx on rig_item_logs(user_id, created_at desc);
