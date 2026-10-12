-- Migration 0016: Remove check constraint on messages.bot to support the 5-bot roster and custom bots
alter table messages drop constraint if exists messages_bot_check;
