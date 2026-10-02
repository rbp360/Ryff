-- 0006_item_headline_and_takeaways.sql
-- Adds punchy editorial headline and bulleted key takeaways to items table

alter table items add column if not exists headline text;
alter table items add column if not exists key_takeaways text[] not null default '{}';

create index if not exists items_key_takeaways_idx on items using gin(key_takeaways);
