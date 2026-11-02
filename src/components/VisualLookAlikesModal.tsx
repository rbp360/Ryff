'use client';

import { useState, useEffect } from 'react';

interface LookAlikeMatch {
  rig_item_id: number;
  brand: string | null;
  model: string | null;
  category: string | null;
  image_url?: string | null;
  score: number;
}

interface VisualLookAlikesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rigItemId: number | string;
  itemName: string;
  currentImageUrl?: string | null;
}

export function VisualLookAlikesModal({
  isOpen,
  onClose,
  rigItemId,
  itemName,
  currentImageUrl,
}: VisualLookAlikesModalProps) {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<LookAlikeMatch[]>([]);
  const [hasVector, setHasVector] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    async function fetchLookAlikes() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/knowledge/identify?rigItemId=${rigItemId}`);
        if (!res.ok) throw new Error('Failed to load visual twins');
        const data = await res.json();
        if (!ignore) {
          setHasVector(data.hasVector ?? false);
          setMatches(data.matches || []);
        }
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : 'Error fetching visual matches');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchLookAlikes();
    return () => {
      ignore = true;
    };
  }, [isOpen, rigItemId]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '85vh',
          overflowY: 'auto',
          background: '#121212',
          border: '1px solid var(--ln)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.9), 0 0 32px rgba(34, 197, 94, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>🔍</span> Visual Look-Alikes &amp; Twins
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--mu)' }}>
              Nearest visual matches in Ryff&apos;s multimodal community brain.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--mu)',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Source Gear Reference */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#0a0a0a',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid var(--ln)',
          }}
        >
          {currentImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentImageUrl}
              alt={itemName}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                objectFit: 'cover',
                background: '#141414',
              }}
            />
          ) : (
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                background: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}
            >
              🎸
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '10px', color: 'var(--mu)', fontWeight: 800, textTransform: 'uppercase' }}>
              Reference Instrument
            </span>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {itemName}
            </div>
          </div>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '6px',
              background: hasVector ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: hasVector ? 'var(--ac)' : '#f59e0b',
              border: hasVector ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            {hasVector ? '✓ Vector Active' : 'Pending Vector'}
          </span>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '36px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                border: '3px solid rgba(255,255,255,0.2)',
                borderTopColor: 'var(--ac)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--mu)', fontWeight: 600 }}>
              Searching 768-dimensional visual embedding space...
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444', color: '#f87171', fontSize: '12px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Results */}
        {!loading && !error && (
          <div>
            {matches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', background: '#0a0a0a', borderRadius: '12px', border: '1px solid var(--ln)' }}>
                <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>✨</span>
                <b style={{ color: 'var(--tx)', fontSize: '14px', display: 'block', marginBottom: '4px' }}>
                  Unique Instrument in the Brain
                </b>
                <p style={{ color: 'var(--mu)', fontSize: '12px', margin: 0 }}>
                  No close visual look-alikes registered in the community database yet. Your guitar is serving as the visual anchor!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--mu)' }}>
                  Closest Registered Guitars ({matches.length})
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                  {matches.map((m) => {
                    const similarityPct = Math.round(m.score * 100);
                    return (
                      <div
                        key={m.rig_item_id}
                        style={{
                          background: '#0a0a0a',
                          border: '1px solid var(--ln)',
                          borderRadius: '10px',
                          padding: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'border-color 0.2s ease',
                        }}
                      >
                        {m.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.image_url}
                            alt={`${m.brand || ''} ${m.model || ''}`}
                            style={{
                              width: '52px',
                              height: '52px',
                              borderRadius: '8px',
                              objectFit: 'cover',
                              background: '#141414',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '52px',
                              height: '52px',
                              borderRadius: '8px',
                              background: '#1a1a1a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '20px',
                              flexShrink: 0,
                            }}
                          >
                            🎸
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.brand} {m.model}
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--mu)' }}>
                            {m.category || 'Gear'}
                          </span>
                          <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div
                              style={{
                                flex: 1,
                                height: '4px',
                                background: '#222',
                                borderRadius: '2px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(100, similarityPct)}%`,
                                  height: '100%',
                                  background: similarityPct >= 80 ? 'var(--ac)' : similarityPct >= 65 ? '#38bdf8' : '#f59e0b',
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                color: similarityPct >= 80 ? 'var(--ac)' : similarityPct >= 65 ? '#38bdf8' : '#f59e0b',
                              }}
                            >
                              {similarityPct}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid var(--ln)' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--sf)',
              border: '1px solid var(--ln)',
              color: 'var(--tx)',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

