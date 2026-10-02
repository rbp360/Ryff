import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, DEV_ADMIN_USER } from '@/lib/session';
import { syncDealsForWants } from '@/lib/deal-sync';

export async function POST() {
  const session = await getSession();
  const userId = session?.userId || DEV_ADMIN_USER.userId;

  const userRow = await db`
    select reverb_region from users where id = ${userId} limit 1
  `;
  const reverbRegion = userRow[0]?.reverb_region || 'UK_ONLY';

  const userWants = await db`
    select want_key, budget_gbp
    from rig_items
    where user_id = ${userId} and kind = 'want' and want_key is not null
  `;

  if (userWants.length === 0) {
    return NextResponse.json({ ok: true, synced: 0, message: 'No active wants to track' });
  }

  const targets = userWants.map((w) => ({
    want_key: w.want_key,
    budget_gbp: w.budget_gbp,
    reverb_region: reverbRegion,
  }));

  const result = await syncDealsForWants(targets);

  return NextResponse.json({
    ok: true,
    totalFound: result.totalFound,
    totalUpserted: result.totalUpserted,
  });
}
