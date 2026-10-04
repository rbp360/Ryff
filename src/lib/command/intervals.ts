import { db } from '../db';

export const DEFAULT_RESTRING_INTERVAL_DAYS = 60;

export interface RestringIntervalResult {
  intervalDays: number;
  basis: string;
  eventCount: number;
  isLearned: boolean;
}

export interface RestringHealth {
  status: 'fresh' | 'good' | 'due_soon' | 'overdue' | 'unknown';
  diffDays: number | null;
  intervalDays: number;
  basis: string;
  isOverdue: boolean;
  text: string;
}

/**
 * Computes the median restring interval for a gear item when 3 or more string events exist.
 * Stores the computed median interval and basis in rig_items.
 */
export async function computeAndUpdateRestringInterval(
  userId: string,
  gearId: number
): Promise<RestringIntervalResult> {
  // Query all string change events for this gear item, ordered chronologically
  const logs = await db<{ event_date: string }[]>`
    select event_date
    from rig_item_logs
    where rig_item_id = ${gearId}
      and user_id = ${userId}
      and event_type in ('strings', 'string_change')
    order by event_date asc, created_at asc
  `;

  const eventCount = logs.length;

  if (eventCount < 3) {
    return {
      intervalDays: DEFAULT_RESTRING_INTERVAL_DAYS,
      basis: `default (${DEFAULT_RESTRING_INTERVAL_DAYS} days)`,
      eventCount,
      isLearned: false,
    };
  }

  // Calculate day deltas between consecutive events
  const intervals: number[] = [];
  for (let i = 1; i < logs.length; i++) {
    const prevTime = new Date(logs[i - 1].event_date).getTime();
    const currTime = new Date(logs[i].event_date).getTime();
    const diffDays = Math.round((currTime - prevTime) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      intervals.push(diffDays);
    }
  }

  if (intervals.length === 0) {
    return {
      intervalDays: DEFAULT_RESTRING_INTERVAL_DAYS,
      basis: `default (${DEFAULT_RESTRING_INTERVAL_DAYS} days)`,
      eventCount,
      isLearned: false,
    };
  }

  // Compute median interval
  intervals.sort((a, b) => a - b);
  const mid = Math.floor(intervals.length / 2);
  const medianDays =
    intervals.length % 2 === 1
      ? intervals[mid]
      : Math.round((intervals[mid - 1] + intervals[mid]) / 2);

  const basis = `based on your last ${eventCount} changes`;

  // Update rig_items with learned habit interval
  await db`
    update rig_items set
      restring_interval_days = ${medianDays},
      restring_interval_basis = ${basis},
      updated_at = now()
    where id = ${gearId} and user_id = ${userId}
  `;

  return {
    intervalDays: medianDays,
    basis,
    eventCount,
    isLearned: true,
  };
}

/**
 * Manually overrides the restring interval for a specific instrument
 */
export async function overrideRestringInterval(
  userId: string,
  gearId: number,
  days: number
): Promise<{ intervalDays: number; basis: string }> {
  const basis = 'manual override';
  await db`
    update rig_items set
      restring_interval_days = ${days},
      restring_interval_basis = ${basis},
      updated_at = now()
    where id = ${gearId} and user_id = ${userId}
  `;

  return { intervalDays: days, basis };
}

/**
 * Evaluates the restringing health of an instrument based on last restringing date
 * and configured/learned interval.
 */
export function getGearRestringHealth(
  lastRestrungAt?: string | Date | null,
  configuredInterval?: number | null,
  configuredBasis?: string | null
): RestringHealth {
  const intervalDays = configuredInterval && configuredInterval > 0
    ? configuredInterval
    : DEFAULT_RESTRING_INTERVAL_DAYS;

  const basis = configuredBasis || `default (${intervalDays} days)`;

  if (!lastRestrungAt) {
    return {
      status: 'unknown',
      diffDays: null,
      intervalDays,
      basis,
      isOverdue: false,
      text: 'Not logged yet',
    };
  }

  const d = new Date(lastRestrungAt);
  if (isNaN(d.getTime())) {
    return {
      status: 'unknown',
      diffDays: null,
      intervalDays,
      basis,
      isOverdue: false,
      text: String(lastRestrungAt),
    };
  }

  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const isOverdue = diffDays >= intervalDays;

  let status: RestringHealth['status'] = 'good';
  if (diffDays <= 7) {
    status = 'fresh';
  } else if (isOverdue) {
    status = 'overdue';
  } else if (diffDays >= intervalDays - 14) {
    status = 'due_soon';
  }

  let text: string;
  if (diffDays === 0) {
    text = 'Restrung today';
  } else if (diffDays === 1) {
    text = 'Restrung yesterday';
  } else if (isOverdue) {
    text = `${diffDays} days ago (Overdue · ${basis})`;
  } else {
    text = `${diffDays} days ago (${intervalDays - diffDays} days left · ${basis})`;
  }

  return {
    status,
    diffDays,
    intervalDays,
    basis,
    isOverdue,
    text,
  };
}
