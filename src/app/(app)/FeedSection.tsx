'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { FeedItemCard, UserPreferences } from '@/lib/personalization';

interface FeedSectionProps {
  initialPersonalized: FeedItemCard[];
  initialGlobal: FeedItemCard[];
  initialPreferences: UserPreferences;
}

const CATEGORIES = [
  { id: 'all', label: 'All Gear' },
  { id: 'guitar', label: 'Guitars' },
  { id: 'amp', label: 'Amps & Tubes' },
  { id: 'pedal', label: 'Pedals & FX' },
  { id: 'modeller', label: 'Modellers & Tech' },
  { id: 'artist', label: 'Artists' },
  { id: 'deal', label: 'Deals' },
];

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
  // Default / drums / deals / industry / other
  return '/images/Drum gear brand default.png';
}

function FeedCardImage({
  imageUrl,
  category,
  title,
}: {
  imageUrl?: string | null;
  category?: string;
  title: string;
}) {
  const fallback = getCategoryFallbackImage(category);
  const [src, setSrc] = useState<string>(imageUrl || fallback);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative w-full h-44 rounded-lg overflow-hidden bg-slate-950/80 border border-slate-800/80 group-hover:border-slate-700/80 transition my-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={title}
        loading="lazy"
        onError={() => {
          if (!hasError) {
            setHasError(true);
            setSrc(fallback);
          }
        }}
        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent pointer-events-none" />
    </div>
  );
}

export function FeedSection({
  initialPersonalized,
  initialGlobal,
  initialPreferences,
}: FeedSectionProps) {
  const [activeTab, setActiveTab] = useState<'personalized' | 'global'>('personalized');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [personalizedItems, setPersonalizedItems] = useState<FeedItemCard[]>(initialPersonalized);
  const [globalItems, setGlobalItems] = useState<FeedItemCard[]>(initialGlobal);
  const [preferences, setPreferences] = useState<UserPreferences>(initialPreferences);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [playerInput, setPlayerInput] = useState('');
  const [brandInput, setBrandInput] = useState('');
  const [isPending, startTransition] = useTransition();

  const currentItems = activeTab === 'personalized' ? personalizedItems : globalItems;

  // Filter items by category client-side or fetch if needed
  const displayItems = activeCategory === 'all' 
    ? currentItems 
    : currentItems.filter(item => item.category === activeCategory);

  const handleReaction = async (itemId: number, reactionType: 'like' | 'dislike') => {
    // Optimistic UI update
    const updateItems = (list: FeedItemCard[]) =>
      list.map((it) => {
        if (it.id === itemId) {
          const nextReaction = it.user_reaction === reactionType ? null : reactionType;
          return { ...it, user_reaction: nextReaction };
        }
        return it;
      });

    setPersonalizedItems(updateItems);
    setGlobalItems(updateItems);

    try {
      const currentItem = currentItems.find(it => it.id === itemId);
      const nextReaction = currentItem?.user_reaction === reactionType ? null : reactionType;

      await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, reaction: nextReaction }),
      });
    } catch (err) {
      console.error('Failed to submit reaction:', err);
    }
  };

  const handleSavePreferences = async () => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(preferences),
        });

        if (res.ok) {
          const updated = await res.json();
          setPreferences(updated);
          setShowPreferencesModal(false);

          // Refresh feed
          const feedRes = await fetch('/api/feed?tab=personalized&limit=15');
          if (feedRes.ok) {
            const data = await feedRes.json();
            setPersonalizedItems(data.feed);
          }
        }
      } catch (err) {
        console.error('Failed to save preferences:', err);
      }
    });
  };

  const addPlayer = () => {
    const trimmed = playerInput.trim();
    if (trimmed && !preferences.favoritePlayers.includes(trimmed)) {
      setPreferences({
        ...preferences,
        favoritePlayers: [...preferences.favoritePlayers, trimmed],
      });
      setPlayerInput('');
    }
  };

  const removePlayer = (name: string) => {
    setPreferences({
      ...preferences,
      favoritePlayers: preferences.favoritePlayers.filter((p) => p !== name),
    });
  };

  const addBrand = () => {
    const trimmed = brandInput.trim();
    if (trimmed && !preferences.followedBrands.includes(trimmed)) {
      setPreferences({
        ...preferences,
        followedBrands: [...preferences.followedBrands, trimmed],
      });
      setBrandInput('');
    }
  };

  const removeBrand = (name: string) => {
    setPreferences({
      ...preferences,
      followedBrands: preferences.followedBrands.filter((b) => b !== name),
    });
  };

  return (
    <section className="space-y-6 pt-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>📰</span> Today&apos;s Gear Radar
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              Scored & Clustered
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Multi-source topic clustering, brand intelligence, and personalized rig matching.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Main Feed View Tabs */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-1 flex items-center">
            <button
              onClick={() => setActiveTab('personalized')}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
                activeTab === 'personalized'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>For Your Rig</span>
            </button>
            <button
              onClick={() => setActiveTab('global')}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
                activeTab === 'global'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Global Buzz</span>
            </button>
          </div>

          {/* Preferences Button */}
          <button
            onClick={() => setShowPreferencesModal(true)}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5"
            title="Customise followed brands & favourite players"
          >
            <span className="hidden sm:inline">Preferences</span>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition border ${
              activeCategory === cat.id
                ? 'bg-slate-800 text-cyan-400 border-cyan-500/50 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Active Taste Filters Banner */}
      {activeTab === 'personalized' && (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-medium">Tracking for you:</span>
            {preferences.favoritePlayers.length > 0 && (
              <span className="text-cyan-300 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded font-mono text-[11px]">
                {preferences.favoritePlayers.slice(0, 3).join(', ')}
                {preferences.favoritePlayers.length > 3 ? ` +${preferences.favoritePlayers.length - 3}` : ''}
              </span>
            )}
            {preferences.followedBrands.length > 0 && (
              <span className="text-amber-300 bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded font-mono text-[11px]">
                {preferences.followedBrands.slice(0, 3).join(', ')}
                {preferences.followedBrands.length > 3 ? ` +${preferences.followedBrands.length - 3}` : ''}
              </span>
            )}
            {preferences.favoritePlayers.length === 0 && preferences.followedBrands.length === 0 && (
              <span className="text-slate-500 italic">No custom artists or brands set yet. Click Preferences to add them!</span>
            )}
          </div>
          <button
            onClick={() => setShowPreferencesModal(true)}
            className="text-[11px] text-cyan-400 hover:underline font-medium"
          >
            Edit Artists & Brands →
          </button>
        </div>
      )}

      {/* Feed Cards Grid */}
      {displayItems.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
          <p className="text-sm text-slate-400">No stories found in this category.</p>
          <button
            onClick={() => setActiveCategory('all')}
            className="text-xs text-cyan-400 hover:underline mt-2 inline-block"
          >
            Reset to All Gear
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayItems.map((item, idx) => (
            <div
              key={item.id}
              className={`bg-slate-900/70 border rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition relative group ${
                item.user_reaction === 'dislike'
                  ? 'border-slate-800/50 opacity-60'
                  : 'border-slate-800 hover:bg-slate-900/90'
              }`}
            >
              {/* Card Header: Source & Category & Rank */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      #{idx + 1}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 font-medium truncate max-w-[120px]">
                      {item.source_name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold tracking-wider bg-slate-800/50 text-slate-400">
                      {item.category}
                    </span>
                  </div>

                  {/* Match Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {item.match_badges.map((badge) => (
                      <span
                        key={badge}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Story / Video Image Preview with Brand Default Fallback */}
                <FeedCardImage
                  imageUrl={item.image_url}
                  category={item.category}
                  title={item.title}
                />

                {/* Article / Video Headline & Title */}
                <div>
                  {item.headline && (
                    <div className="text-xs font-bold text-amber-400 font-mono tracking-wide mb-1 uppercase">
                      ⚡ {item.headline}
                    </div>
                  )}
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-slate-100 hover:text-cyan-400 transition line-clamp-2 block leading-snug group-hover:text-cyan-300"
                  >
                    {item.title}
                  </a>
                </div>

                {/* Editorial Summary */}
                <p className="text-xs text-slate-300/90 leading-relaxed border-l-2 border-cyan-700/60 pl-3">
                  {item.summary}
                </p>

                {/* Key Takeaways Bullets (if available) */}
                {item.key_takeaways && item.key_takeaways.length > 0 && (
                  <div className="space-y-1 pt-1 bg-slate-950/40 rounded-lg p-2.5 border border-slate-800/60">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-1">
                      Key Takeaways:
                    </div>
                    <ul className="space-y-1">
                      {item.key_takeaways.map((takeaway, tIdx) => (
                        <li key={tIdx} className="text-[11px] text-slate-300 flex items-start gap-1.5 leading-tight">
                          <span className="text-cyan-400 mt-0.5">•</span>
                          <span>{takeaway}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>


              {/* Card Footer: Entities & Interactive Actions */}
              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
                {/* Entities Tags */}
                <div className="flex items-center gap-1.5 flex-wrap overflow-hidden max-w-[65%]">
                  {item.players.map((p) => (
                    <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/40 text-cyan-300 font-mono">
                      {p}
                    </span>
                  ))}
                  {item.brands.map((b) => (
                    <span key={b} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300/90 font-mono">
                      #{b}
                    </span>
                  ))}
                </div>

                {/* Interactive Feedback & Chat */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleReaction(item.id, 'like')}
                    className={`px-2 py-1 rounded-lg border text-xs transition ${
                      item.user_reaction === 'like'
                        ? 'bg-cyan-950 text-cyan-400 border-cyan-700'
                        : 'bg-slate-800/70 text-slate-400 border-slate-700/60 hover:text-slate-200'
                    }`}
                    title="Boost similar gear"
                  >
                    ▲ Relevant
                  </button>
                  <button
                    onClick={() => handleReaction(item.id, 'dislike')}
                    className={`px-2 py-1 rounded-lg border text-xs transition ${
                      item.user_reaction === 'dislike'
                        ? 'bg-red-950/60 text-red-400 border-red-800'
                        : 'bg-slate-800/70 text-slate-400 border-slate-700/60 hover:text-slate-200'
                    }`}
                    title="Soft-dampen this topic"
                  >
                    ▼ Hide
                  </button>
                  <Link
                    href={`/chat?q=${encodeURIComponent(`What do you think about: "${item.title}"?`)}`}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition flex items-center gap-1 font-medium"
                    title="Ask Hosts about this story"
                  >
                    <span>Ask Hosts</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preferences Customization Modal */}
      {showPreferencesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Personalise Your Gear Feed
              </h3>
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="text-slate-400 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Add your favourite guitarists and followed brands. Any article mentioning them will automatically receive an instant priority boost on your feed.
            </p>

            {/* Favourite Players Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Favourite Guitarists / Players
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={playerInput}
                  onChange={(e) => setPlayerInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPlayer())}
                  placeholder="e.g. Chris Impellitteri, Nita Strauss, Slash..."
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={addPlayer}
                  className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-medium text-white transition"
                >
                  Add
                </button>
              </div>

              {/* Players Tag Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto">
                {preferences.favoritePlayers.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono"
                  >
                    <span>{p}</span>
                    <button
                      type="button"
                      onClick={() => removePlayer(p)}
                      className="text-cyan-400 hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Followed Brands Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Followed Brands & Builders
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={brandInput}
                  onChange={(e) => setBrandInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBrand())}
                  placeholder="e.g. B.C. Rich, TC Electronic, Marshall..."
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={addBrand}
                  className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-medium text-white transition"
                >
                  Add
                </button>
              </div>

              {/* Brands Tag Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto">
                {preferences.followedBrands.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-amber-950 text-amber-300 border border-amber-800 font-mono"
                  >
                    <span>{b}</span>
                    <button
                      type="button"
                      onClick={() => removeBrand(b)}
                      className="text-amber-400 hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowPreferencesModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white font-medium transition disabled:opacity-50"
              >
                {isPending ? 'Saving...' : 'Save & Refresh Feed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
