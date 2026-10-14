-- Migration 0017: Rig Specs, Pickup Serials, Exact String Types and Strikethrough Log Voiding

alter table rig_items add column if not exists string_type text;
alter table rig_items add column if not exists pickup_bridge_serial text;
alter table rig_items add column if not exists pickup_middle_serial text;
alter table rig_items add column if not exists pickup_neck_serial text;

alter table rig_item_logs add column if not exists is_voided boolean not null default false;
alter table rig_item_logs add column if not exists voided_reason text;
alter table rig_item_logs add column if not exists voided_at timestamptz;
