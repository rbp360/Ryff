import { db } from './db';
import capsConfig from '../../config/caps.json';

export interface UsageCaps {
  dailyMsgs: number;
  monthlyBudgetUsd: number;
  maxOutputTokens: number;
  maxInputChars: number;
  historyTurns: number;
}

export function getCapsForCohort(cohort: 'cadre' | 'public' = 'public'): UsageCaps {
  const cohortCaps = (capsConfig as Record<string, any>)[cohort] || capsConfig.public;
  return {
    dailyMsgs: cohortCaps.daily_msgs,
    monthlyBudgetUsd: cohortCaps.monthly_budget_usd,
    maxOutputTokens: cohortCaps.max_output_tokens,
    maxInputChars: cohortCaps.max_input_chars,
    historyTurns: cohortCaps.history_turns,
  };
}

export function getGlobalCaps() {
  return capsConfig.global;
}

export interface UserUsageCheckResult {
  allowed: boolean;
  reason?: string;
  inCharacterMessage?: string;
  msgsToday: number;
  dailyCap: number;
  costMonthUsd: number;
  monthlyBudgetUsd: number;
}

/**
 * Checks per-user daily message cap, monthly budget, and global daily spend.
 * Returns persona-flavoured rejection messages when limits are reached (zero LLM call).
 */
export async function checkUserUsage(
  userId: string,
  cohort: 'cadre' | 'public' = 'cadre',
  bot: 'hank' | 'vee' = 'hank'
): Promise<UserUsageCheckResult> {
  const caps = getCapsForCohort(cohort);
  const globalCaps = getGlobalCaps();

  // 1. Check user today's message count and cost
  const [todayUsage] = await db`
    select msgs, cost_usd
    from usage_daily
    where user_id = ${userId} and day = current_date
  `;

  const msgsToday = todayUsage ? Number(todayUsage.msgs) : 0;
  const todayCost = todayUsage ? Number(todayUsage.cost_usd) : 0;

  // 2. Check user monthly total spend
  const [monthUsage] = await db`
    select coalesce(sum(cost_usd), 0) as total_month_cost
    from usage_daily
    where user_id = ${userId} and day >= date_trunc('month', current_date)
  `;
  const costMonthUsd = monthUsage ? Number(monthUsage.total_month_cost) : 0;

  // 3. Check global daily spend (sum of all user chats + pipeline runs today)
  const [globalChatToday] = await db`
    select coalesce(sum(cost_usd), 0) as total_chat_cost
    from usage_daily
    where day = current_date
  `;
  const [globalPipelineToday] = await db`
    select coalesce(sum(cost_usd), 0) as total_pipeline_cost
    from pipeline_runs
    where started_at >= current_date
  `;
  const globalTodayCost = Number(globalChatToday?.total_chat_cost || 0) + Number(globalPipelineToday?.total_pipeline_cost || 0);

  // Check Daily Cap
  if (msgsToday >= caps.dailyMsgs) {
    const inCharacterMessage = bot === 'hank'
      ? `Hank's put his soldering iron away and gone to the pub. You've hit your daily message limit (${caps.dailyMsgs}/${caps.dailyMsgs}). Back tomorrow morning.`
      : `Vee is off checking fresh warehouse stock and deal listings! You've used all ${caps.dailyMsgs} chats for today. Catch you tomorrow!`;

    return {
      allowed: false,
      reason: `Daily message cap reached (${msgsToday}/${caps.dailyMsgs})`,
      inCharacterMessage,
      msgsToday,
      dailyCap: caps.dailyMsgs,
      costMonthUsd,
      monthlyBudgetUsd: caps.monthlyBudgetUsd,
    };
  }

  // Check Monthly Budget
  if (costMonthUsd >= caps.monthlyBudgetUsd) {
    const inCharacterMessage = bot === 'hank'
      ? `Monthly bench time is used up. Come back next month when the ledger resets.`
      : `You've reached your monthly allowance! Rest up and see you next month for more gear talk.`;

    return {
      allowed: false,
      reason: `Monthly budget cap reached ($${costMonthUsd.toFixed(2)} / $${caps.monthlyBudgetUsd.toFixed(2)})`,
      inCharacterMessage,
      msgsToday,
      dailyCap: caps.dailyMsgs,
      costMonthUsd,
      monthlyBudgetUsd: caps.monthlyBudgetUsd,
    };
  }

  // Check Global Daily Cap
  if (globalTodayCost >= globalCaps.daily_spend_usd) {
    return {
      allowed: false,
      reason: 'Global platform capacity limit reached for today.',
      inCharacterMessage: "GuitarBot is resting for today after high traffic. We'll be back online tomorrow morning!",
      msgsToday,
      dailyCap: caps.dailyMsgs,
      costMonthUsd,
      monthlyBudgetUsd: caps.monthlyBudgetUsd,
    };
  }

  return {
    allowed: true,
    msgsToday,
    dailyCap: caps.dailyMsgs,
    costMonthUsd,
    monthlyBudgetUsd: caps.monthlyBudgetUsd,
  };
}

/**
 * Increments user daily usage counter and accumulated USD cost
 */
export async function recordMessageUsage(userId: string, costUsd: number): Promise<void> {
  await db`
    insert into usage_daily (user_id, day, msgs, cost_usd)
    values (${userId}, current_date, 1, ${costUsd})
    on conflict (user_id, day) do update set
      msgs = usage_daily.msgs + 1,
      cost_usd = usage_daily.cost_usd + ${costUsd}
  `;
}

/**
 * Ensures a single pipeline run cost does not exceed $2.00,
 * and daily global spend across runs and chats does not exceed $8.00.
 */
export function checkPipelineSpendCap(currentRunCostUsd: number, todayTotalCostUsd: number): { allowed: boolean; reason?: string } {
  const globalCaps = getGlobalCaps();

  if (currentRunCostUsd >= globalCaps.pipeline_run_usd) {
    return {
      allowed: false,
      reason: `Pipeline run cost ($${currentRunCostUsd.toFixed(4)}) reached max allowed limit of $${globalCaps.pipeline_run_usd.toFixed(2)}.`,
    };
  }

  if (todayTotalCostUsd >= globalCaps.daily_spend_usd) {
    return {
      allowed: false,
      reason: `Global daily spend ($${todayTotalCostUsd.toFixed(4)}) reached max allowed daily limit of $${globalCaps.daily_spend_usd.toFixed(2)}.`,
    };
  }

  return { allowed: true };
}
