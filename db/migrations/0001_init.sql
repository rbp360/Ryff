create extension if not exists pgcrypto;

create table sources (
  id serial primary key,
  kind text not null check (kind in ('rss','youtube','reverb')),
  name text not null,
  url text not null unique,
  tier text not null default 'news' check (tier in ('news','brand_pr','video')),
  keyword_prefilter text[],            -- if set, drop items whose title/snippet match none
  active boolean not null default true,
  last_fetched_at timestamptz,
  last_status text
);

create table items (
  id bigserial primary key,
  source_id int not null references sources(id),
  url_hash text not null unique,       -- sha256 of canonical url
  url text not null,
  title text not null,
  snippet text,                        -- truncated feed snippet, max ~500 chars
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  digested_at timestamptz,
  relevant boolean,
  summary text,                        -- our own words, <= 40 words
  item_type text check (item_type in ('launch','review','deal','rumour','opinion','news','other')),
  brands text[] not null default '{}',
  products text[] not null default '{}',
  hype smallint check (hype between 0 and 5),
  search tsvector generated always as (
    to_tsvector('english', coalesce(title,'')||' '||coalesce(summary,'')||' '||coalesce(snippet,''))
  ) stored
);
create index items_search_idx on items using gin(search);
create index items_published_idx on items(published_at desc);
create index items_brands_idx on items using gin(brands);

create table pipeline_runs (
  id bigserial primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','ok','partial','failed')),
  stage_stats jsonb not null default '{}',
  cost_usd numeric(10,4) not null default 0,
  error text
);

create table episodes (
  id bigserial primary key,
  run_id bigint references pipeline_runs(id),
  created_at timestamptz not null default now(),
  headline text not null,
  topics jsonb not null,               -- [{title, hank, vee, disagreement, source_item_ids:[]}]
  transcript jsonb not null,           -- raw turns for audit
  status text not null default 'draft' check (status in ('draft','published','failed','withdrawn')),
  published_at timestamptz
);

create table invite_codes (
  code text primary key,
  email_hint text,
  used_by uuid,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now(),
  consented_at timestamptz not null,
  is_adult boolean not null,
  uk_resident boolean,
  cohort text not null default 'cadre' check (cohort in ('cadre','public')),
  deleted_at timestamptz
);

create table rig_items (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  raw_text text not null,
  brand text, model text, category text,
  kind text not null check (kind in ('own','want')),
  budget_gbp int,
  want_key text,                        -- normalised "brand model", lowercase
  created_at timestamptz not null default now()
);
create index rig_want_idx on rig_items(want_key) where kind = 'want';

create table deals (
  id bigserial primary key,
  want_key text not null,
  listing_id text not null,
  listing_url text not null,
  title text not null,
  price_amount numeric(10,2),
  price_currency text,
  condition text,
  seen_at timestamptz not null default now(),
  unique (want_key, listing_id)
);

create table messages (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  conversation_id uuid not null,
  bot text not null check (bot in ('hank','vee')),
  role text not null check (role in ('user','assistant')),
  content text not null,
  tokens_in int, tokens_out int, cache_read_tokens int,
  cost_usd numeric(10,5),
  flagged boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_user_idx on messages(user_id, created_at desc);

create table usage_daily (
  user_id uuid not null references users(id) on delete cascade,
  day date not null,
  msgs int not null default 0,
  cost_usd numeric(10,4) not null default 0,
  primary key (user_id, day)
);

create table clicks (
  id bigserial primary key,
  user_id uuid references users(id) on delete set null,
  bot text,
  episode_id bigint references episodes(id),
  dest_url text not null,
  created_at timestamptz not null default now()
);

create table events (
  id bigserial primary key,
  user_id uuid references users(id) on delete set null,
  name text not null,                   -- signup, rig_saved, chat_sent, episode_viewed, deal_clicked, survey_answered, presale_clicked
  props jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table feedback (
  id bigserial primary key,
  user_id uuid references users(id) on delete set null,
  kind text not null,                   -- 'general','bad_answer','survey'
  body text,
  created_at timestamptz not null default now()
);
