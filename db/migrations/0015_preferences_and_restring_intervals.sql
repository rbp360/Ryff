-- Migration 0015: User personality preference & Rig restringing intervals

-- 1. Extend users table with persona/personality preference
alter table users 
  add column if not exists personality text not null default 'hank' 
  check (personality in ('hank', 'vee', 'dry', 'blunt', 'chatty'));

-- 2. Extend rig_items with learned / manual restringing intervals
alter table rig_items
  add column if not exists restring_interval_days int,
  add column if not exists restring_interval_basis text;
