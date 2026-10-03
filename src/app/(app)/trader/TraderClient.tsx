'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatGearTitle } from '@/lib/gear-utils';
import { BackButton } from '@/components/BackButton';


export interface DealRow {
  id: number | string;
  want_key: string;
  listing_id?: string | null;
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

export interface WantRow {
  want_key: string;
  raw_text: string;
  brand: string | null;
  model: string | null;
  budget_gbp: number | null;
}

interface TraderClientProps {
  userWants: WantRow[];
  deals: DealRow[];
  fallbackDeals: DealRow[];
  initialWatchlistIds: string[];
}

function calculateDaysOnMarket(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export default function TraderClient({
  userWants,
  deals,
  fallbackDeals,
  initialWatchlistIds,
}: TraderClientProps) {
  const [watchlistSet, setWatchlistSet] = useState<Set<string>>(
    () => new Set(initialWatchlistIds)
  );
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const displayDeals = deals.length > 0 ? deals : fallbackDeals;

  const isMatched = (deal: DealRow) => {
    const key = deal.listing_id || String(deal.id);
    return watchlistSet.has(key);
  };

  const handleToggleWatch = async (deal: DealRow) => {
    const key = deal.listing_id || String(deal.id);
    setTogglingId(key);

    // Optimistic UI update
    setWatchlistSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: key, dealId: deal.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setWatchlistSet((prev) => {
          const next = new Set(prev);
          if (data.watched) {
            next.add(key);
          } else {
            next.delete(key);
          }
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to toggle watchlist:', err);
    } finally {
      setTogglingId(null);
    }
  };

  // Filter deals if Watchlist toggle is active
  const filteredDeals = showWatchlistOnly
    ? displayDeals.filter((d) => isMatched(d))
    : displayDeals;

  return (
    <>
      <div className="top" style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BackButton fallbackHref="/" />
          <h1 style={{ marginBottom: 0 }}>Trader</h1>
        </div>
        <Link href="/setup" className="gearbtn" aria-label="Setup">
          ⚙
        </Link>
      </div>

      <p className="sub">Used gear matched to your wants and budget.</p>

      {/* Wants Tracker Overview */}
      {userWants.length > 0 ? (
        <div className="card" style={{ marginTop: '16px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--mu)' }}>
              Tracking {userWants.length} {userWants.length === 1 ? 'Want' : 'Wants'}
            </span>

            {/* Space under / next to 'edit wants in rig room' for watchlist toggle switch */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: showWatchlistOnly ? '#f59e0b' : 'var(--tx)',
                  userSelect: 'none',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '32px',
                    height: '18px',
                    backgroundColor: showWatchlistOnly ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                    borderRadius: '9px',
                    transition: 'background-color 0.2s ease',
                    border: showWatchlistOnly ? 'none' : '1px solid var(--ln)',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: showWatchlistOnly ? '16px' : '2px',
                      width: '14px',
                      height: '14px',
                      backgroundColor: showWatchlistOnly ? '#000' : '#fff',
                      borderRadius: '50%',
                      transition: 'left 0.2s ease',
                    }}
                  />
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill={showWatchlistOnly ? '#f59e0b' : 'none'} stroke={showWatchlistOnly ? '#f59e0b' : 'currentColor'} strokeWidth="2.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  Watchlist ({watchlistSet.size})
                </span>
                <input
                  type="checkbox"
                  checked={showWatchlistOnly}
                  onChange={(e) => setShowWatchlistOnly(e.target.checked)}
                  style={{ display: 'none' }}
                />
              </label>

              <Link href="/rig" style={{ fontSize: '11px', color: 'var(--ac2)', fontWeight: 700 }}>
                Edit Wants in Rig room ›
              </Link>
            </div>
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
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                color: showWatchlistOnly ? '#f59e0b' : 'var(--tx)',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '32px',
                  height: '18px',
                  backgroundColor: showWatchlistOnly ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                  borderRadius: '9px',
                  transition: 'background-color 0.2s ease',
                  border: showWatchlistOnly ? 'none' : '1px solid var(--ln)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '2px',
                    left: showWatchlistOnly ? '16px' : '2px',
                    width: '14px',
                    height: '14px',
                    backgroundColor: showWatchlistOnly ? '#000' : '#fff',
                    borderRadius: '50%',
                    transition: 'left 0.2s ease',
                  }}
                />
              </div>
              <span>Watchlist ({watchlistSet.size})</span>
              <input
                type="checkbox"
                checked={showWatchlistOnly}
                onChange={(e) => setShowWatchlistOnly(e.target.checked)}
                style={{ display: 'none' }}
              />
            </label>
          </div>
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

      <h2>
        {showWatchlistOnly
          ? `Watchlist (${filteredDeals.length})`
          : deals.length > 0
          ? 'Matches'
          : 'Marketplace Finds'}
      </h2>

      {/* Deals List */}
      {filteredDeals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <p style={{ color: 'var(--mu)', fontSize: '13px' }}>
            {showWatchlistOnly
              ? 'No items in your watchlist yet. Click the star icon on any listing to add it to your watchlist.'
              : 'No marketplace deals recorded yet for your tracked wants. Ryff monitors Reverb used listings twice daily.'}
          </p>
        </div>
      ) : (
        filteredDeals.map((deal) => {
          const formattedPrice = deal.price_amount ? `£${Number(deal.price_amount).toLocaleString()}` : 'Price on listing';
          const originalPrice = deal.original_price_amount ? `£${Number(deal.original_price_amount).toLocaleString()}` : null;
          const daysOnMarket = calculateDaysOnMarket(deal.published_at || deal.seen_at);
          const metaString = [
            deal.condition || 'Used',
            daysOnMarket !== null ? `${daysOnMarket}d on market` : 'Recent',
            'Delivery',
          ].join(' · ');

          const watched = isMatched(deal);
          const key = deal.listing_id || String(deal.id);
          const isToggling = togglingId === key;

          return (
            <div key={deal.id} className="deal" style={{ position: 'relative' }}>
              {/* Star Watch Button in Top Right */}
              <button
                type="button"
                onClick={() => handleToggleWatch(deal)}
                disabled={isToggling}
                aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
                title={watched ? 'In Watchlist' : 'Add to Watchlist'}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                  transition: 'transform 0.15s ease',
                  opacity: isToggling ? 0.5 : 1,
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill={watched ? '#f59e0b' : 'none'}
                  stroke={watched ? '#f59e0b' : 'rgba(255, 255, 255, 0.4)'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    filter: watched ? 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.5))' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>

              {/* Listing Image from Reverb or fallback */}
              {deal.image_url ? (
                <img
                  src={deal.image_url}
                  alt={deal.title}
                  style={{
                    width: '96px',
                    height: '96px',
                    minWidth: '96px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid var(--ln)',
                    backgroundColor: 'var(--sf)',
                  }}
                />
              ) : (
                <div
                  className="ph"
                  style={{ width: '96px', height: '96px', minWidth: '96px', fontSize: '10px' }}
                >
                  ▨ Gear
                  <br />
                  96×96
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0, paddingRight: '28px' }}>
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

      {deals.length > 0 && !showWatchlistOnly && (
        <p className="sub" style={{ marginTop: '12px' }}>
          I’ll keep monitoring Reverb for price drops on your tracked wants.
        </p>
      )}
    </>
  );
}
