import { db } from './db';
import { searchListings, ReverbListing } from './reverb';

export interface WantTarget {
  want_key: string;
  budget_gbp?: number | null;
  reverb_region?: string | null;
}

export interface SyncDealsResult {
  totalFound: number;
  totalUpserted: number;
}

/**
 * Searches Reverb for active user wants, filters by budget and region,
 * and upserts matching listings into the PostgreSQL deals table.
 */
export async function syncDealsForWants(wants: WantTarget[]): Promise<SyncDealsResult> {
  const activeWants = wants.filter((w) => w.want_key && w.want_key.trim());
  if (activeWants.length === 0) {
    return { totalFound: 0, totalUpserted: 0 };
  }

  let totalFound = 0;
  let totalUpserted = 0;

  for (const want of activeWants) {
    const rawKey = want.want_key.trim();
    // Clean key from colons or symbols for Reverb search
    const cleanSearchQuery = rawKey.replace(/^[:\s–—•·\-,;]+/, '').trim();
    if (!cleanSearchQuery) continue;

    const maxBudget = want.budget_gbp ? Number(want.budget_gbp) : null;
    const regionPref = want.reverb_region || 'UK_ONLY';

    let itemRegion: string | undefined;
    let shipsTo: string | undefined;

    if (regionPref === 'UK_ONLY') {
      itemRegion = 'GB';
    } else if (regionPref === 'SHIPS_TO_UK') {
      shipsTo = 'GB';
    } else if (regionPref === 'US_ONLY') {
      itemRegion = 'US';
    }

    try {
      // 1. Fetch live used listings
      const listings = await searchListings(cleanSearchQuery, {
        condition: 'used',
        limit: 15,
        itemRegion,
        shipsTo,
      });

      totalFound += listings.length;

      // 2. Budget filter if set
      let matched = listings;
      if (maxBudget !== null) {
        matched = listings.filter((l) => l.priceAmount === null || l.priceAmount <= maxBudget * 1.3);
      }

      // Sort by price ascending
      matched.sort((a, b) => (a.priceAmount || 999999) - (b.priceAmount || 999999));

      const topDeals = matched.slice(0, 5);

      for (const deal of topDeals) {
        await db`
          insert into deals (
            want_key, listing_id, listing_url, title, price_amount, original_price_amount, price_currency, condition, published_at, price_drop_text, seen_at
          )
          values (
            ${rawKey},
            ${deal.listingId},
            ${deal.url},
            ${deal.title},
            ${deal.priceAmount},
            ${deal.originalPriceAmount || null},
            ${deal.priceCurrency},
            ${deal.condition},
            ${deal.publishedAt ? new Date(deal.publishedAt) : null},
            ${deal.priceDropText || null},
            now()
          )
          on conflict (want_key, listing_id) do update set
            title = excluded.title,
            price_amount = excluded.price_amount,
            original_price_amount = coalesce(excluded.original_price_amount, deals.original_price_amount),
            price_currency = excluded.price_currency,
            condition = excluded.condition,
            published_at = coalesce(excluded.published_at, deals.published_at),
            price_drop_text = excluded.price_drop_text,
            seen_at = now()
        `;
        totalUpserted++;
      }
    } catch (err) {
      console.warn(`[deal-sync] Failed to sync listings for want "${cleanSearchQuery}":`, err);
    }
  }

  return { totalFound, totalUpserted };
}
