import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, DEV_ADMIN_USER, ensureUserExists } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  const userId = session?.userId || DEV_ADMIN_USER.userId;

  try {
    const rows = await db<{ listing_id: string }[]>`
      select listing_id
      from watchlist
      where user_id = ${userId}
    `;
    const watchlistListingIds = rows.map((r) => r.listing_id);
    return NextResponse.json({ watchlistListingIds });
  } catch (err) {
    console.error('[Watchlist API GET error]:', err);
    return NextResponse.json({ watchlistListingIds: [] });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  const user = session || DEV_ADMIN_USER;
  await ensureUserExists(user);

  try {
    const body = await request.json();
    const { listingId, dealId } = body;

    if (!listingId) {
      return NextResponse.json({ error: 'listingId is required' }, { status: 400 });
    }

    const listingIdStr = String(listingId);
    const parsedDealId = dealId ? Number(dealId) : null;

    // Check if already in watchlist
    const existing = await db`
      select id from watchlist
      where user_id = ${user.userId} and listing_id = ${listingIdStr}
    `;

    if (existing.length > 0) {
      // Remove from watchlist
      await db`
        delete from watchlist
        where user_id = ${user.userId} and listing_id = ${listingIdStr}
      `;
      return NextResponse.json({ watched: false });
    } else {
      // Add to watchlist
      await db`
        insert into watchlist (user_id, deal_id, listing_id)
        values (${user.userId}, ${parsedDealId}, ${listingIdStr})
        on conflict (user_id, listing_id) do nothing
      `;
      return NextResponse.json({ watched: true });
    }
  } catch (err) {
    console.error('[Watchlist API POST error]:', err);
    return NextResponse.json({ error: 'Failed to update watchlist' }, { status: 500 });
  }
}
