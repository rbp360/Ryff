import { db } from '../db';
import { costUsd, TokenUsage } from '../cost';
import { checkUserUsage } from '../usage';

export interface RecordAssistantCostParams {
  userId: string;
  intent: 'action' | 'query' | 'app_help' | 'chat';
  toolName?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd?: number;
}

export interface AssistantQuotaCheckResult {
  allowed: boolean;
  reason?: string;
  countToday: number;
  limit: number;
}

const DAILY_STRUCTURED_LIMIT = 50; // Generous daily allowance for actions and queries

/**
 * Checks per-user daily quota for assistant commands.
 * Distinguishes between open Backstage chat (stricter limit) and structured commands.
 */
export async function checkAssistantQuota(
  userId: string,
  intent: 'action' | 'query' | 'app_help' | 'chat'
): Promise<AssistantQuotaCheckResult> {
  // If open chat, enforce the existing Backstage daily chat quota
  if (intent === 'chat') {
    const chatCheck = await checkUserUsage(userId, 'cadre', 'hank');
    if (!chatCheck.allowed) {
      return {
        allowed: false,
        reason: chatCheck.inCharacterMessage || chatCheck.reason || 'Daily chat quota reached.',
        countToday: chatCheck.msgsToday,
        limit: chatCheck.dailyCap,
      };
    }
  }

  // For structured actions, queries, and help: generous 50 requests/day
  const [todayRequests] = await db`
    select count(*) as count_today
    from assistant_cost_logs
    where user_id = ${userId} and created_at >= current_date
  `;

  const countToday = todayRequests ? Number(todayRequests.count_today) : 0;

  if (countToday >= DAILY_STRUCTURED_LIMIT) {
    return {
      allowed: false,
      reason: `You have reached your daily command limit (${DAILY_STRUCTURED_LIMIT} requests/day). Limits reset tomorrow morning.`,
      countToday,
      limit: DAILY_STRUCTURED_LIMIT,
    };
  }

  return {
    allowed: true,
    countToday,
    limit: DAILY_STRUCTURED_LIMIT,
  };
}

/**
 * Logs token counts, model, and calculated USD cost to assistant_cost_logs,
 * and updates usage_daily so overall platform spend remains synchronized.
 */
export async function recordAssistantCost(params: RecordAssistantCostParams): Promise<number> {
  const { userId, intent, toolName, model, inputTokens, outputTokens } = params;

  const usage: TokenUsage = {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
  };

  const calculatedCost = params.costUsd !== undefined ? params.costUsd : costUsd(model, usage);

  // 1. Insert into assistant_cost_logs audit table
  await db`
    insert into assistant_cost_logs (
      user_id, intent, tool_name, model, input_tokens, output_tokens, cost_usd
    ) values (
      ${userId},
      ${intent},
      ${toolName || null},
      ${model},
      ${inputTokens},
      ${outputTokens},
      ${calculatedCost}
    )
  `;

  // 2. Synchronize with usage_daily table for aggregate user billing
  await db`
    insert into usage_daily (user_id, day, msgs, cost_usd)
    values (${userId}, current_date, 1, ${calculatedCost})
    on conflict (user_id, day) do update set
      msgs = usage_daily.msgs + 1,
      cost_usd = usage_daily.cost_usd + ${calculatedCost}
  `;

  return calculatedCost;
}

export interface UserDailyCostSummary {
  userId: string;
  email?: string;
  cohort?: string;
  totalRequests: number;
  actionCount: number;
  queryCount: number;
  helpCount: number;
  chatCount: number;
  totalCostUsd: number;
  lastActive: Date;
}

/**
 * Aggregates per-user assistant costs and request counts for today (for Admin Command Centre).
 */
export async function getDailyAssistantCostsByUser(): Promise<UserDailyCostSummary[]> {
  const rows = await db`
    select 
      u.id as user_id,
      u.email,
      u.cohort,
      count(a.id) as total_requests,
      count(a.id) filter (where a.intent = 'action') as action_count,
      count(a.id) filter (where a.intent = 'query') as query_count,
      count(a.id) filter (where a.intent = 'app_help') as help_count,
      count(a.id) filter (where a.intent = 'chat') as chat_count,
      coalesce(sum(a.cost_usd), 0) as total_cost_usd,
      max(a.created_at) as last_active
    from assistant_cost_logs a
    join users u on u.id = a.user_id
    where a.created_at >= current_date
    group by u.id, u.email, u.cohort
    order by total_cost_usd desc, total_requests desc
    limit 25
  `;

  return rows.map((r) => ({
    userId: String(r.user_id),
    email: r.email ? String(r.email) : undefined,
    cohort: r.cohort ? String(r.cohort) : undefined,
    totalRequests: Number(r.total_requests || 0),
    actionCount: Number(r.action_count || 0),
    queryCount: Number(r.query_count || 0),
    helpCount: Number(r.help_count || 0),
    chatCount: Number(r.chat_count || 0),
    totalCostUsd: Number(r.total_cost_usd || 0),
    lastActive: new Date(r.last_active),
  }));
}
