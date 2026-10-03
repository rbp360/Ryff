-- Migration 0011: Add image_url to deals table and create watchlist table

alter table deals
  add column if not exists image_url text;

create table if not exists watchlist (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  deal_id bigint references deals(id) on delete cascade,
  listing_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create index if not exists watchlist_user_idx on watchlist(user_id);
