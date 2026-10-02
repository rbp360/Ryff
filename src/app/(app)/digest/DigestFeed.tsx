'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FeedItemCard } from '@/lib/personalization';

interface DigestFeedProps {
  initialPersonalized: FeedItemCard[];
  initialGlobal: FeedItemCard[];
  sourcesCount: number;
  newCount: number;
  updatedTime: string;
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'guitar', label: 'Guitars' },
  { id: 'amp', label: 'Amps' },
  { id: 'pedal', label: 'Pedals' },
  { id: 'modeller', label: 'Modellers' },
  { id: 'artist', label: 'Artists' },
];

function getTimeAgo(dateStr?: string | null): string {
  if (!dateStr) return 'Recent';
  const diffHours = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function DigestFeed({
  initialPersonalized,
  initialGlobal,
  sourcesCount,
  newCount,
  updatedTime,
}: DigestFeedProps) {
  const [tab, setTab] = useState<'personalized' | 'global'>('personalized');
  const [category, setCategory] = useState('all');
  const [personalizedItems, setPersonalizedItems] = useState<FeedItemCard[]>(initialPersonalized);
  const [globalItems, setGlobalItems] = useState<FeedItemCard[]>(initialGlobal);

  const activeItems = tab === 'personalized' ? personalizedItems : globalItems;
  const filteredItems = category === 'all'
    ? activeItems
    : activeItems.filter((i) => i.category?.toLowerCase() === category);

  async function handleReaction(itemId: number, reaction: 'like' | 'dislike') {
    const updateList = (list: FeedItemCard[]) =>
      list.map((it) =>
        it.id === itemId
          ? { ...it, user_reaction: it.user_reaction === reaction ? null : reaction }
          : it
      );

    setPersonalizedItems(updateList);
    setGlobalItems(updateList);

    try {
      await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, reaction }),
      });
    } catch {
      // Optimistic reaction failed silently
    }
  }

  return (
    <>
      <div className="top" style={{ marginBottom: '10px' }}>
        <h1 style={{ marginBottom: 0 }}>Digest</h1>
        <Link href="/setup" className="gearbtn" aria-label="Setup">
          ⚙
        </Link>
      </div>

      <div className="upd" style={{ marginTop: '4px', marginBottom: '16px' }}>
        <i className="dot" />
        Updated {updatedTime} · {sourcesCount} sources · {newCount} new
      </div>

      {/* Tab Switcher: For Your Rig vs Global Gear Buzz */}
      <div className="seg" style={{ marginBottom: '12px' }}>
        <button
          type="button"
          className={tab === 'personalized' ? 'on' : ''}
          onClick={() => setTab('personalized')}
        >
          For Your Rig & Tastes
        </button>
        <button
          type="button"
          className={tab === 'global' ? 'on' : ''}
          onClick={() => setTab('global')}
        >
          Global Gear Buzz
        </button>
      </div>

      {/* Category Filter Chips */}
      <div className="chips" style={{ marginBottom: '20px' }}>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`chip ${category === c.id ? 'on' : ''}`}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <p style={{ color: 'var(--mu)', fontSize: '13px', margin: 0 }}>
            No stories found in this category. Check back soon or switch to Global Gear Buzz.
          </p>
        </div>
      )}

      {/* Story Cards */}
      {filteredItems.map((item) => {
        const primaryMatch = item.match_badges?.[0]?.replace(/^(🎯 Wanted:|🏷️ Followed:|🔌 In Your Rig:|🎸)\s*/i, '');
        const botTake = item.key_takeaways?.[0] || item.summary || 'Worth keeping an eye on this week.';
        const timeAgo = getTimeAgo(item.published_at);

        return (
          <div key={item.id} className="story">
            {/* 16:9 Thumbnail Slot */}
            {item.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image_url}
                alt={item.headline || item.title}
                loading="lazy"
                style={{
                  width: '100%',
                  aspectRatio: '16/9',
                  objectFit: 'cover',
                  display: 'block',
                  borderBottom: '1px solid var(--ln)',
                }}
              />
            ) : (
              <div className="ph" style={{ borderBottom: '1px solid var(--ln)' }}>
                ▨ {item.source_name} · 16:9
              </div>
            )}

            <div className="b">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <small>
                  {item.source_name} · {timeAgo}
                </small>
                {item.buzz_count && item.buzz_count > 1 ? (
                  <span style={{ fontSize: '10px', color: 'var(--ac)', fontWeight: 800 }}>
                    {item.buzz_count} OUTLETS
                  </span>
                ) : null}
              </div>

              <h3>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener nofollow"
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  {item.headline || item.title}
                </a>
              </h3>

              {primaryMatch && (
                <span className="why">Matches: {primaryMatch}</span>
              )}

              {/* Bot editorial take with 28px avatar */}
              <div className="say" style={{ marginTop: '8px' }}>
                <div
                  className="ph round"
                  style={{ width: 28, height: 28, minWidth: 28, fontSize: '9px' }}
                >
                  Hank
                </div>
                <span>{botTake}</span>
              </div>

              {/* Actions: Thumbs Up/Down and Debate Deep Link */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--ln)',
                }}
              >
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleReaction(item.id, 'like')}
                    style={{
                      fontSize: '12px',
                      color: item.user_reaction === 'like' ? 'var(--ac)' : 'var(--mu)',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>▲</span> Relevant
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReaction(item.id, 'dislike')}
                    style={{
                      fontSize: '12px',
                      color: item.user_reaction === 'dislike' ? '#ef4444' : 'var(--mu)',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>▼</span> Hide
                  </button>
                </div>

                <Link
                  href="/backstage"
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--ac2)',
                  }}
                >
                  Ask Hank about this ›
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
