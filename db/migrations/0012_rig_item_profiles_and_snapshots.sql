-- Migration 0012: Rig Item Profile Specifications, Presets, and Historical Snapshots
-- Adds granular string setup, tuning, pickups, amp presets, drum piece configurations, and snapshot history

alter table rig_items add column if not exists number_of_strings integer;
alter table rig_items add column if not exists tuning text;
alter table rig_items add column if not exists string_gauge text;
alter table rig_items add column if not exists string_manufacturer text;
alter table rig_items add column if not exists pickup_bridge text;
alter table rig_items add column if not exists pickup_middle text;
alter table rig_items add column if not exists pickup_neck text;
alter table rig_items add column if not exists drum_head_details text;
alter table rig_items add column if not exists drum_head_tension text;
alter table rig_items add column if not exists drum_head_change_date text;
alter table rig_items add column if not exists drum_body text;
alter table rig_items add column if not exists drum_mods_muffles text;
alter table rig_items add column if not exists drum_pieces jsonb not null default '[]'::jsonb;
alter table rig_items add column if not exists cymbal_pieces jsonb not null default '[]'::jsonb;
alter table rig_items add column if not exists snapshots jsonb not null default '[]'::jsonb;
