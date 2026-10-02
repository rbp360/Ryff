-- Rigistry Catalog and Reference Taxonomy Migration
-- Adds brands, brand aliases, instrument taxonomy, tuning presets, gauge presets, and gear setup snapshots.

-- 1. Brands / Manufacturers Table
create table if not exists brands (
  id serial primary key,
  name text not null unique,
  normalized_name text not null unique,
  categories text[] not null default '{}',
  is_canonical boolean not null default false,
  country text,
  website text,
  logo_url text,
  created_at timestamptz not null default now()
);

create index if not exists brands_normalized_idx on brands(normalized_name);
create index if not exists brands_categories_idx on brands using gin(categories);

-- 2. Brand Aliases Table
create table if not exists brand_aliases (
  id serial primary key,
  brand_id int not null references brands(id) on delete cascade,
  alias text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists brand_aliases_alias_idx on brand_aliases(alias);

-- 3. Instrument Taxonomy Table
create table if not exists instrument_taxonomy (
  id serial primary key,
  name text not null unique,
  normalized_name text not null unique,
  category text not null,
  room_keys text[] not null default '{}',
  is_common boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists inst_tax_cat_idx on instrument_taxonomy(category);
create index if not exists inst_tax_norm_idx on instrument_taxonomy(normalized_name);
create index if not exists inst_tax_rooms_idx on instrument_taxonomy using gin(room_keys);

-- 4. Tuning Presets Table
create table if not exists tuning_presets (
  id serial primary key,
  instrument_kind text not null check (instrument_kind in ('guitar', 'bass')),
  string_count int not null,
  name text not null,
  notes text[] not null,
  created_at timestamptz not null default now(),
  unique (instrument_kind, string_count, name)
);

create index if not exists tunings_lookup_idx on tuning_presets(instrument_kind, string_count);

-- 5. String Gauge Presets Table
create table if not exists string_gauge_presets (
  id serial primary key,
  instrument_kind text not null check (instrument_kind in ('guitar', 'bass')),
  string_count int not null,
  gauge_set text not null,
  label text,
  created_at timestamptz not null default now(),
  unique (instrument_kind, string_count, gauge_set)
);

-- 6. Enrich user rig_items with Rigistry metadata
alter table rig_items add column if not exists room text;
alter table rig_items add column if not exists kind_detail text;
alter table rig_items add column if not exists serial_number text;
alter table rig_items add column if not exists nickname text;
alter table rig_items add column if not exists color text;
alter table rig_items add column if not exists notes text;
alter table rig_items add column if not exists amp_settings text;
alter table rig_items add column if not exists settings_file_url text;
alter table rig_items add column if not exists image_url text;
alter table rig_items add column if not exists specs jsonb not null default '{}';
alter table rig_items add column if not exists archived boolean not null default false;
alter table rig_items add column if not exists deleted boolean not null default false;
alter table rig_items add column if not exists brand_id int references brands(id) on delete set null;

-- 7. Setup Snapshots Table (for historical rig configurations & drum/amp specs)
create table if not exists rig_item_snapshots (
  id bigserial primary key,
  rig_item_id bigint not null references rig_items(id) on delete cascade,
  saved_at timestamptz not null default now(),
  month_year text,
  string_manufacturer text,
  pickup_b_manufacturer text,
  pickup_m_manufacturer text,
  pickup_n_manufacturer text,
  number_of_strings int,
  tuning text,
  string_gauge text,
  amp_settings text,
  settings_file_url text,
  drum_head_details text,
  drum_head_tension text,
  drum_body text,
  drum_mods_muffles text,
  drum_pieces jsonb not null default '[]',
  cymbal_pieces jsonb not null default '[]',
  specs jsonb not null default '{}'
);

create index if not exists rig_item_snapshots_item_idx on rig_item_snapshots(rig_item_id, saved_at desc);
