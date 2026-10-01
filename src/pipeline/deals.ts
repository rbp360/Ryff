import { db } from '../lib/db';
import { searchListings } from '../lib/reverb';

export interface DealsStageResult {
  distinctWantsCount: number;
  dealsFoundCount: number;
  dealsUpsertedCount: number;
  expiredPurgedCount: number;
}

/**
 * Pipeline step that queries Reverb for distinct active wants from user rigs,
 * matches live used listings, upserts top deals into the deals table,
 * and purges stale listings older than 7 days.
 */
export async function runDealsPipeline(): Promise<DealsStageResult> {
  console.log('[Pipeline: Deals] Starting Reverb deal matcher...');

  // 1. Get distinct want_keys with any associated maximum budget
  const distinctWants = await db`
    select want_key, max(budget_gbp) as max_budget
    from rig_items
    where kind = 'want' and want_key is not null and want_key != ''
    group by want_key
  `;

  console.log(`[Pipeline: Deals] Found ${distinctWants.length} distinct want targets.`);

  let totalDealsFound = 0;
  let totalDealsUpserted = 0;

  for (const want of distinctWants) {
    const key = want.want_key as string;
    const maxBudget = want.max_budget ? Number(want.max_budget) : null;

    try {
      // Respect 1 req/sec politeness limit
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const listings = await searchListings(key, { condition: 'used', limit: 24 });
      totalDealsFound += listings.length;

      // Filter by budget if specified
      let matched = listings;
      if (maxBudget !== null) {
        matched = listings.filter((l) => l.priceAmount === null || l.priceAmount <= maxBudget * 1.3); // allow minor currency/tax wiggle
      }

      // Sort by price ascending (best deals first)
      matched.sort((a, b) => (a.priceAmount || 999999) - (b.priceAmount || 999999));

      // Pick top 3
      const top3 = matched.slice(0, 3);

      for (const deal of top3) {
        await db`
          insert into deals (
            want_key, listing_id, listing_url, title, price_amount, price_currency, condition, seen_at
          )
          values (
            ${key},
            ${deal.listingId},
            ${deal.url},
            ${deal.title},
            ${deal.priceAmount},
            ${deal.priceCurrency},
            ${deal.condition},
            now()
          )
          on conflict (want_key, listing_id) do update set
            title = excluded.title,
            price_amount = excluded.price_amount,
            price_currency = excluded.price_currency,
            condition = excluded.condition,
            seen_at = now()
        `;
        totalDealsUpserted++;
      }
    } catch (err) {
      console.warn(`[Pipeline: Deals] Error matching deals for want "${key}":`, err);
    }
  }

  // 2. Purge stale deals older than 7 days
  const purgeResult = await db`
    delete from deals
    where seen_at < now() - interval '7 days'
    returning id
  `;

  const expiredPurgedCount = purgeResult.length;
  console.log(`[Pipeline: Deals] Finished. Found: ${totalDealsFound}, Upserted: ${totalDealsUpserted}, Expired purged: ${expiredPurgedCount}`);

  return {
    distinctWantsCount: distinctWants.length,
    dealsFoundCount: totalDealsFound,
    dealsUpsertedCount: totalDealsUpserted,
    expiredPurgedCount,
  };
}
