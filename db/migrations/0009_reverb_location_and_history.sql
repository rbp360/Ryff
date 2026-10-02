-- Migration 0009: Add Reverb days on market, price drop tracking, and user region preferences

alter table deals
  add column if not exists published_at timestamptz,
  add column if not exists original_price_amount numeric(10,2),
  add column if not exists price_drop_text text,
  add column if not exists first_seen_at timestamptz default now();

alter table users
  add column if not exists reverb_region text default 'SHIPS_TO_UK';
