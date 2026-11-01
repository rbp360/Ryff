-- Migration 0019: Gear Knowledge Brain (pgvector)
-- Canonical component catalog + passport knowledge chunks, embedded with 768-dim vectors
-- (Gemini gemini-embedding-001, outputDimensionality=768). Structured specs stay in rig_items
-- (SQL aggregates); vectors are only for fuzzy identity resolution and semantic retrieval.

create extension if not exists vector;

-- 1. Canonical, deduplicated gear entities (pickups, strings, ...)
create table if not exists canonical_components (
  id bigserial primary key,
  category text not null check (category in ('pickup', 'strings', 'bridge', 'tuners', 'other')),
  manufacturer text not null,
  model_name text not null,
  sub_type text,
  normalized_key text not null,                 -- normalised "manufacturer model_name"
  specs jsonb not null default '{}',
  canonical_text text not null,                 -- text that was embedded
  embedding vector(768),
  source text not null default 'llm' check (source in ('llm', 'fallback', 'seed', 'manual')),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category, normalized_key)
);

create index if not exists canonical_components_embedding_idx
  on canonical_components using hnsw (embedding vector_cosine_ops);
create index if not exists canonical_components_category_idx on canonical_components(category);

-- 2. Alias cache: raw user strings -> canonical component (skips embedding on repeat input)
create table if not exists component_aliases (
  category text not null,
  alias_key text not null,                      -- normalised raw user text
  component_id bigint not null references canonical_components(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (category, alias_key)
);

-- 3. Link rig items to canonical components, per slot
create table if not exists rig_item_components (
  rig_item_id bigint not null references rig_items(id) on delete cascade,
  slot text not null check (slot in ('pickup_bridge', 'pickup_middle', 'pickup_neck', 'strings')),
  component_id bigint not null references canonical_components(id) on delete cascade,
  raw_text text,
  linked_at timestamptz not null default now(),
  primary key (rig_item_id, slot)
);

create index if not exists rig_item_components_component_idx on rig_item_components(component_id);

-- 4. Anonymous passport narrative chunk + embedding (bot memory). No user id, serials or nicknames.
create table if not exists rig_item_knowledge (
  rig_item_id bigint primary key references rig_items(id) on delete cascade,
  document_chunk text not null,
  content_hash text not null,
  text_embedding vector(768),
  metadata jsonb not null default '{}',
  synced_at timestamptz not null default now()
);

create index if not exists rig_item_knowledge_embedding_idx
  on rig_item_knowledge using hnsw (text_embedding vector_cosine_ops);

