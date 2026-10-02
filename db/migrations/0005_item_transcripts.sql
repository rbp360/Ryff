-- 0005_item_transcripts.sql
-- Adds transcript column to items table for YouTube closed-caption storage

alter table items add column if not exists transcript text;

create index if not exists items_transcript_idx on items(id) where transcript is not null;
