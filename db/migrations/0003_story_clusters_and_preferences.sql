-- 0003_story_clusters_and_preferences.sql
-- Adds topic clustering, buzz tracking, player entity tags, user preferences, and reaction tracking

-- 1. Extend items table with cluster, buzz, and player columns
alter table items add column if not exists cluster_id text;
alter table items add column if not exists buzz_count int not null default 1;
alter table items add column if not exists players text[] not null default '{}';

create index if not exists items_cluster_idx on items(cluster_id);
create index if not exists items_buzz_idx on items(buzz_count desc);
create index if not exists items_players_idx on items using gin(players);

-- 2. Story clusters table for grouping multi-outlet coverage
create table if not exists story_clusters (
  id text primary key,
  headline text not null,
  canonical_brand text,
  canonical_player text,
  article_count int not null default 1,
  source_count int not null default 1,
  top_item_id bigint references items(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists story_clusters_buzz_idx on story_clusters(source_count desc, article_count desc);
create index if not exists story_clusters_date_idx on story_clusters(last_seen_at desc);

-- 3. Extend users with followed brands and favorite players
alter table users add column if not exists favorite_players text[] not null default '{}';
alter table users add column if not exists followed_brands text[] not null default '{}';

-- 4. User item reactions (Thumbs Up / Thumbs Down)
create table if not exists item_reactions (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  item_id bigint not null references items(id) on delete cascade,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  unique(user_id, item_id)
);

create index if not exists item_reactions_user_idx on item_reactions(user_id);
create index if not exists item_reactions_item_idx on item_reactions(item_id);
