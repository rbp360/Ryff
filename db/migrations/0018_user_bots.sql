-- Migration 0018: user_bots table for custom user-created companion bots
create table if not exists user_bots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  dossier jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_bots_user_id on user_bots(user_id);
create index if not exists idx_user_bots_active on user_bots(is_active);
