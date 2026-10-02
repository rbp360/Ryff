-- 0007_item_image_url.sql
-- Adds image_url column to items table for story/video hero images

alter table items add column if not exists image_url text;
create index if not exists items_image_url_idx on items(image_url) where image_url is not null;
