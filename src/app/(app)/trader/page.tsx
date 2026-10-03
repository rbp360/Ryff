import { db } from '@/lib/db';
import { getSession, DEV_ADMIN_USER } from '@/lib/session';
import TraderClient, { DealRow, WantRow } from './TraderClient';

export const revalidate = 0; // Dynamic server component

export default async function TraderPage() {
  const session = await getSession();
  const userId = session?.userId || DEV_ADMIN_USER.userId;

  // 1. Fetch user's wants
  const userWants = await db<WantRow[]>`
    SELECT want_key, raw_text, brand, model, budget_gbp
    FROM rig_items
    WHERE user_id = ${userId} AND kind = 'want'
  `.catch(() => []);

  const wantKeys = userWants.map((w) => w.want_key).filter(Boolean);

  // 2. Query deals matched to user wants, or fallback to all latest deals
  let deals: DealRow[] = [];
  if (wantKeys.length > 0) {
    deals = await db<DealRow[]>`
      SELECT id, want_key, listing_id, title, price_amount, original_price_amount, price_drop_text, condition, listing_url, seen_at, published_at, image_url
      FROM deals
      WHERE want_key = ANY(${wantKeys})
      ORDER BY seen_at DESC
      LIMIT 20
    `.catch(() => []);
  }

  // If no specific want matches, get recent marketplace finds
  let fallbackDeals: DealRow[] = [];
  if (deals.length === 0) {
    fallbackDeals = await db<DealRow[]>`
      SELECT id, want_key, listing_id, title, price_amount, original_price_amount, price_drop_text, condition, listing_url, seen_at, published_at, image_url
      FROM deals
      ORDER BY seen_at DESC
      LIMIT 10
    `.catch(() => []);
  }

  // 3. Fetch user's watchlist listing IDs
  const watchlistRows = await db<{ listing_id: string }[]>`
    SELECT listing_id
    FROM watchlist
    WHERE user_id = ${userId}
  `.catch(() => []);

  const initialWatchlistIds = watchlistRows.map((r) => r.listing_id);

  return (
    <TraderClient
      userWants={userWants}
      deals={deals}
      fallbackDeals={fallbackDeals}
      initialWatchlistIds={initialWatchlistIds}
    />
  );
}
