import capsConfig from '../../config/caps.json';

export interface UsageCaps {
  dailyMsgs: number;
  monthlyBudgetUsd: number;
  maxOutputTokens: number;
  maxInputChars: number;
  historyTurns: number;
}

export function getCapsForCohort(cohort: 'cadre' | 'public' = 'public'): UsageCaps {
  const cohortCaps = capsConfig[cohort] || capsConfig.public;
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
