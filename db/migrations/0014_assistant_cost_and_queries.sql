-- Migration 0014: Assistant Cost Logs & Telemetry
-- Records per-request token usage, estimated USD costs, intents, and tools for command layer

create table if not exists assistant_cost_logs (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  intent text not null check (intent in ('action', 'query', 'app_help', 'chat')),
  tool_name text,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(10, 6) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_assistant_cost_logs_user_date on assistant_cost_logs (user_id, created_at desc);
create index if not exists idx_assistant_cost_logs_created_at on assistant_cost_logs (created_at desc);
