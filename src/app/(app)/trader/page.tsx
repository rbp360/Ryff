import Link from 'next/link';
import { db } from '@/lib/db';
import { getSession, DEV_ADMIN_USER } from '@/lib/session';
import { formatGearTitle } from '@/lib/rigistry-parser';

export const revalidate = 0; // Dynamic server component

interface DealRow {
  id: number | string;
  want_key: string;
  title: string;
  price_amount: number | string | null;
  original_price_amount: number | string | null;
  price_drop_text: string | null;
  condition: string | null;
  listing_url: string;
  seen_at: string | null;
  published_at: string | null;
  image_url?: string | null;
}

interface WantRow {
  want_key: string;
  raw_text: string;
  brand: string | null;
  model: string | null;
  budget_gbp: number | null;
}

function calculateDaysOnMarket(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

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
      SELECT id, want_key, title, price_amount, original_price_amount, price_drop_text, condition, listing_url, seen_at, published_at
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
      SELECT id, want_key, title, price_amount, original_price_amount, price_drop_text, condition, listing_url, seen_at, published_at
      FROM deals
      ORDER BY seen_at DESC
      LIMIT 10
    `.catch(() => []);
  }

  const displayDeals = deals.length > 0 ? deals : fallbackDeals;

  return (
    <>
      <div className="top" style={{ marginBottom: '10px' }}>
        <h1 style={{ marginBottom: 0 }}>Trader</h1>
        <Link href="/setup" className="gearbtn" aria-label="Setup">
          ⚙
        </Link>
      </div>

      <p className="sub">
        Used gear matched to your wants and budget.
      </p>

      {/* Wants Tracker Overview */}
      {userWants.length > 0 ? (
        <div className="card" style={{ marginTop: '16px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--mu)' }}>
              Tracking {userWants.length} {userWants.length === 1 ? 'Want' : 'Wants'}
            </span>
            <Link href="/rig" style={{ fontSize: '11px', color: 'var(--ac2)', fontWeight: 700 }}>
              Edit Wants in Rig room ›
            </Link>
          </div>
          <div className="chips" style={{ marginTop: '10px' }}>
            {userWants.map((w, idx) => (
              <span key={idx} className="chip on" style={{ fontSize: '11px' }}>
                {formatGearTitle(w.brand, w.model, w.raw_text)}
                {w.budget_gbp ? ` (under £${w.budget_gbp})` : ''}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginTop: '16px', textAlign: 'center', padding: '24px 16px' }}>
          <p style={{ color: 'var(--tx)', fontWeight: 800, fontSize: '14px', marginBottom: '6px' }}>
            Your wants list is empty
          </p>
          <p style={{ color: 'var(--mu)', fontSize: '12px', marginBottom: '14px' }}>
            Add gear you are looking for in the Rig room, and Trader will automatically find used bargains and price drops across Reverb.
          </p>
          <Link
            href="/rig"
            className="go"
            style={{ display: 'inline-block', padding: '8px 16px', borderRadius: '8px' }}
          >
            + Add Wants in Rig Room
          </Link>
        </div>
      )}

      <h2>{deals.length > 0 ? 'Matches' : 'Marketplace Finds'}</h2>

      {/* Deals List */}
      {displayDeals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <p style={{ color: 'var(--mu)', fontSize: '13px' }}>
            No marketplace deals recorded yet for your tracked wants. Ryff monitors Reverb used listings twice daily.
          </p>
        </div>
      ) : (
        displayDeals.map((deal) => {
          const formattedPrice = deal.price_amount ? `£${Number(deal.price_amount).toLocaleString()}` : 'Price on listing';
          const originalPrice = deal.original_price_amount ? `£${Number(deal.original_price_amount).toLocaleString()}` : null;
          const daysOnMarket = calculateDaysOnMarket(deal.published_at || deal.seen_at);
          const metaString = [
            deal.condition || 'Used',
            daysOnMarket !== null ? `${daysOnMarket}d on market` : 'Recent',
            'Delivery',
          ].join(' · ');

          return (
            <div key={deal.id} className="deal">
              <div
                className="ph"
                style={{ width: '96px', height: '96px', minWidth: '96px', fontSize: '10px' }}
              >
                ▨ Gear
                <br />
                96×96
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h3>{deal.title}</h3>
                <small>{metaString}</small>

                <div className="price">
                  {formattedPrice}
                  {originalPrice && <s>{originalPrice}</s>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <a
                    href={deal.listing_url}
                    target="_blank"
                    rel="noopener nofollow"
                    className="go"
                  >
                    View listing
                  </a>
                  {deal.price_drop_text && (
                    <span className="tag">{deal.price_drop_text}</span>
                  )}
                  {originalPrice && !deal.price_drop_text && (
                    <span className="tag">PRICE DROP</span>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      {deals.length > 0 && (
        <p className="sub" style={{ marginTop: '12px' }}>
          I’ll keep monitoring Reverb for price drops on your tracked wants.
        </p>
      )}
    </>
  );
}
