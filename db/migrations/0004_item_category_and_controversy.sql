-- 0004_item_category_and_controversy.sql
-- Adds category classification and controversy scoring for items

alter table items add column if not exists category text default 'other';
alter table items add column if not exists controversy smallint default 0 check (controversy between 0 and 5);

create index if not exists items_category_idx on items(category);
create index if not exists items_controversy_idx on items(controversy desc);
