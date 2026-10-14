import { db } from './db';
import capsConfig from '../../config/caps.json';

export interface UsageCaps {
  dailyMsgs: number;
  monthlyBudgetUsd: number;
  maxOutputTokens: number;
  maxInputChars: number;
  historyTurns: number;
}

interface RawCohortCap {
  daily_msgs: number;
  monthly_budget_usd: number;
  max_output_tokens: number;
  max_input_chars: number;
  history_turns: number;
}

export function getCapsForCohort(cohort: 'cadre' | 'public' = 'public'): UsageCaps {
  const cohortCaps = ((capsConfig as unknown) as Record<string, RawCohortCap>)[cohort] || capsConfig.public;
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
  bot: string = 'robbpaul'
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
    let inCharacterMessage = `You've hit your daily message limit (${caps.dailyMsgs}/${caps.dailyMsgs}). Back tomorrow morning.`;
    switch (bot) {
      case 'robbpaul':
        inCharacterMessage = `Rob's packed his gig bag and gone down to rehearsal. You've hit your daily message limit (${caps.dailyMsgs}/${caps.dailyMsgs}). Catch you tomorrow.`;
        break;
      case 'stevie':
        inCharacterMessage = `Stevie's let the power tubes cool down for the night. You've hit your daily message limit (${caps.dailyMsgs}/${caps.dailyMsgs}). Let the ears rest until tomorrow.`;
        break;
      case 'tim':
        inCharacterMessage = `Tim's audio buffer is maxed out for today. Daily message cap reached (${caps.dailyMsgs}/${caps.dailyMsgs}). Resetting at 00:00.`;
        break;
      case 'hank':
        inCharacterMessage = `Hank's put his soldering iron away and gone to the pub. You've hit your daily message limit (${caps.dailyMsgs}/${caps.dailyMsgs}). Back tomorrow morning.`;
        break;
      case 'mcgee':
        inCharacterMessage = `McGee blew another fuse on the 5150. Daily message limit reached (${caps.dailyMsgs}/${caps.dailyMsgs}). Go practice your scales and check back tomorrow!`;
        break;
      case 'vee':
        inCharacterMessage = `Vee is off checking fresh warehouse stock and deal listings! You've used all ${caps.dailyMsgs} chats for today. Catch you tomorrow!`;
        break;
      default:
        inCharacterMessage = `Your companion bot called it a night. Daily message cap reached (${caps.dailyMsgs}/${caps.dailyMsgs}). Catch you tomorrow!`;
        break;
    }

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
    let inCharacterMessage = `Monthly bench time is used up. Come back next month when the ledger resets.`;
    switch (bot) {
      case 'robbpaul':
        inCharacterMessage = `Monthly budget limit reached on gear consultations. Come back next month when the books reset!`;
        break;
      case 'stevie':
        inCharacterMessage = `The studio lock-in is over for this month. Ledger resets next month.`;
        break;
      case 'tim':
        inCharacterMessage = `Monthly compute allocation exceeded. System resets on the 1st of the month.`;
        break;
      case 'hank':
        inCharacterMessage = `Monthly bench time is used up. Come back next month when the ledger resets.`;
        break;
      case 'mcgee':
        inCharacterMessage = `We ran through the whole string budget for this month! See you on the first of the month.`;
        break;
      default:
        inCharacterMessage = `You've reached your monthly allowance! Rest up and see you next month for more gear talk.`;
        break;
    }

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
