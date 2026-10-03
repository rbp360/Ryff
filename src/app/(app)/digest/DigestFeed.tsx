'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FeedItemCard, UserPreferences } from '@/lib/personalization';
import { BackButton } from '@/components/BackButton';


interface DigestFeedProps {
  initialPersonalized: FeedItemCard[];
  initialGlobal: FeedItemCard[];
  initialPreferences?: UserPreferences;
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

function stripEmojis(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E6}-\u{1F1FF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCategoryFallbackImage(category?: string): string {
  const cat = (category || '').toLowerCase();
  if (cat === 'guitar' || cat === 'bass' || cat === 'artist') {
    return '/images/Bass gear brand default.png';
  }
  if (cat === 'amp') {
    return '/images/Logo 1 landscape.jpg';
  }
  if (cat === 'pedal') {
    return '/images/Effects brand default.jpg';
  }
  if (cat === 'modeller' || cat === 'tech' || cat === 'studio') {
    return '/images/Studio gear brand default.png';
  }
  return '/images/Drum gear brand default.png';
}

function FeedImage({ src, alt, category }: { src?: string | null; alt: string; category?: string }) {
  const fallback = getCategoryFallbackImage(category);
  const [imgSrc, setImgSrc] = useState<string>(src || fallback);
  const [hasFailed, setHasFailed] = useState(false);

  if (hasFailed) {
    return (
      <div className="story-thumb-container">
        <div className="story-thumb-placeholder">
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--mu)', letterSpacing: '0.05em' }}>RYFF</span>
        </div>
      </div>
    );
  }

  return (
    <div className="story-thumb-container">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt={alt}
        loading="lazy"
        onError={() => {
          if (imgSrc !== fallback) {
            setImgSrc(fallback);
          } else {
            setHasFailed(true);
          }
        }}
        className="story-thumb-img"
      />
    </div>
  );
}

export function DigestFeed({
  initialPersonalized,
  initialGlobal,
  initialPreferences,
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

  const favoritePlayers = initialPreferences?.favoritePlayers || [];
  const followedBrands = initialPreferences?.followedBrands || [];

  return (
    <>
      <div className="top" style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BackButton fallbackHref="/" />
          <h1 style={{ marginBottom: 0 }}>Digest</h1>
        </div>
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

      {/* Tracking Bar Banner */}
      {tab === 'personalized' && (
        <div
          style={{
            background: 'var(--sf)',
            border: '1px solid var(--ln)',
            borderRadius: '10px',
            padding: '8px 12px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--mu)', fontWeight: 700 }}>Tracking:</span>
            {favoritePlayers.map((p) => (
              <span
                key={p}
                style={{
                  color: 'var(--ac)',
                  background: '#0a1f13',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 800,
                  border: '1px solid var(--ac)',
                }}
              >
                {p}
              </span>
            ))}
            {followedBrands.slice(0, 3).map((b) => (
              <span
                key={b}
                style={{
                  color: '#f59e0b',
                  background: '#261b07',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 800,
                  border: '1px solid #f59e0b',
                }}
              >
                #{b}
              </span>
            ))}
            {favoritePlayers.length === 0 && followedBrands.length === 0 && (
              <span style={{ color: 'var(--mu)', fontStyle: 'italic' }}>
                No custom artists or brands set yet.
              </span>
            )}
          </div>
          <Link
            href="/setup"
            style={{
              color: 'var(--ac)',
              textDecoration: 'underline',
              fontWeight: 700,
              fontSize: '11px',
              marginLeft: 'auto',
            }}
          >
            Edit Artists & Brands →
          </Link>
        </div>
      )}

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
        const primaryMatch = stripEmojis(item.match_badges?.[0]?.replace(/^(Wanted:|Followed:|In Your Rig:)\s*/i, ''));
        const headlineText = stripEmojis(item.headline || item.title);
        const botTake = stripEmojis(item.key_takeaways?.[0] || item.summary || 'Worth keeping an eye on this week.');
        const timeAgo = getTimeAgo(item.published_at);

        return (
          <div key={item.id} className="story">
            <div className="story-main">
              <div className="story-content">
                <div className="story-meta">
                  <small>
                    {item.source_name} · {timeAgo}
                  </small>
                  {item.buzz_count && item.buzz_count > 1 ? (
                    <span className="buzz-badge">
                      {item.buzz_count} OUTLETS
                    </span>
                  ) : null}
                </div>

                <h3 className="story-headline">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener nofollow"
                  >
                    {headlineText}
                  </a>
                </h3>

                {primaryMatch && (
                  <span className="why">Matches: {primaryMatch}</span>
                )}
              </div>

              {/* Compact Thumbnail */}
              <FeedImage
                src={item.image_url}
                alt={headlineText}
                category={item.category}
              />
            </div>

            {/* Hank editorial take */}
            <div className="say">
              <div className="ph round hank-avatar">
                Hank
              </div>
              <span>{botTake}</span>
            </div>

            {/* Actions */}
            <div className="story-actions">
              <div className="story-reactions">
                <button
                  type="button"
                  onClick={() => handleReaction(item.id, 'like')}
                  className={`reaction-btn ${item.user_reaction === 'like' ? 'like-active' : ''}`}
                >
                  <span>▲</span> Relevant
                </button>
                <button
                  type="button"
                  onClick={() => handleReaction(item.id, 'dislike')}
                  className={`reaction-btn ${item.user_reaction === 'dislike' ? 'dislike-active' : ''}`}
                >
                  <span>▼</span> Hide
                </button>
              </div>

              <Link href="/backstage" className="ask-hank-link">
                Ask Hank about this ›
              </Link>
            </div>
          </div>
        );
      })}
    </>
  );
}
