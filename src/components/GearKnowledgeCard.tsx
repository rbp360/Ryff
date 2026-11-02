'use client';

import { useState } from 'react';

export interface CanonicalComponentInfo {
  slot: string;
  raw_text: string;
  manufacturer: string;
  model_name: string;
  sub_type?: string | null;
  category: string;
  verified: boolean;
}

export interface GearKnowledgeData {
  hasTextVector: boolean;
  documentChunk: string | null;
  hasImageVector: boolean;
  components: CanonicalComponentInfo[];
}

interface GearKnowledgeCardProps {
  itemId: number | string;
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  stringGauge?: string | null;
  tuning?: string | null;
  knowledge?: GearKnowledgeData | null;
  onOpenLookAlikes?: () => void;
}

export function GearKnowledgeCard({
  brand: _brand,
  model: _model,
  stringGauge,
  tuning,
  knowledge,
  onOpenLookAlikes,
}: GearKnowledgeCardProps) {
  const [showRAGChunk, setShowRAGChunk] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsData, setStatsData] = useState<{
    metric: string;
    sampleSize: number;
    rows: Array<{ value: string; count: number; percentage: number }>;
  } | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'string_gauge' | 'tuning' | 'bridge_pickup'>('string_gauge');

  async function loadCommunityStats(metric: 'string_gauge' | 'tuning' | 'bridge_pickup') {
    setSelectedMetric(metric);
    setStatsLoading(true);
    setShowStatsModal(true);
    try {
      const res = await fetch(`/api/knowledge/stats?metric=${metric}`);
      if (res.ok) {
        const data = await res.json();
        setStatsData(data);
      }
    } catch (err) {
      console.warn('[Knowledge] Failed to fetch stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }

  const hasText = knowledge?.hasTextVector ?? false;
  const hasImage = knowledge?.hasImageVector ?? false;
  const components = knowledge?.components || [];

  return (
    <div
      style={{
        background: '#0e0e0e',
        border: '1px solid var(--ln)',
        borderRadius: '14px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🧠</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--tx)' }}>
              Community Knowledge Brain
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--mu)' }}>
              Vector embeddings &amp; canonical gear resolution powering Ryff AI bots.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {onOpenLookAlikes && hasImage && (
            <button
              type="button"
              onClick={onOpenLookAlikes}
              style={{
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                fontSize: '11px',
                fontWeight: 700,
                padding: '5px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>🔍</span> Visual Twins
            </button>
          )}

          <button
            type="button"
            onClick={() => loadCommunityStats('string_gauge')}
            style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: 'var(--ac)',
              fontSize: '11px',
              fontWeight: 700,
              padding: '5px 10px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>📊</span> Community Stats
          </button>
        </div>
      </div>

      {/* Vector Status Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
        <div
          style={{
            background: '#141414',
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid var(--ln)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <small style={{ color: 'var(--mu)', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>
              Semantic RAG Vector
            </small>
            <b style={{ fontSize: '12px', color: 'var(--tx)' }}>Gemini Text-001 (768d)</b>
          </div>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '6px',
              background: hasText ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              color: hasText ? 'var(--ac)' : 'var(--mu)',
              border: hasText ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--ln)',
            }}
          >
            {hasText ? '✓ Grounded' : 'Pending'}
          </span>
        </div>

        <div
          style={{
            background: '#141414',
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid var(--ln)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <small style={{ color: 'var(--mu)', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>
              Multimodal Visual Vector
            </small>
            <b style={{ fontSize: '12px', color: 'var(--tx)' }}>Gemini Embedding 2 (768d)</b>
          </div>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '6px',
              background: hasImage ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              color: hasImage ? '#38bdf8' : 'var(--mu)',
              border: hasImage ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid var(--ln)',
            }}
          >
            {hasImage ? '✓ Indexed' : 'No Photo'}
          </span>
        </div>
      </div>

      {/* Canonical Resolved Entities */}
      {components.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--ln)', paddingTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--tx)' }}>
              Resolved Canonical Components ({components.length})
            </span>
            <span style={{ fontSize: '10px', color: 'var(--mu)' }}>Deduplicated in Community Catalog</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {components.map((c, idx) => (
              <div
                key={idx}
                style={{
                  background: '#161616',
                  border: '1px solid var(--ln)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ color: 'var(--ac)', fontWeight: 800 }}>
                  {formatSlotLabel(c.slot)}:
                </span>
                <span style={{ color: '#fff', fontWeight: 600 }}>
                  {c.manufacturer} {c.model_name}
                </span>
                {c.verified && (
                  <span title="Verified in manufacturer catalogue" style={{ color: '#38bdf8', fontSize: '10px' }}>
                    ✓
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RAG Knowledge Chunk View */}
      {knowledge?.documentChunk && (
        <div style={{ borderTop: '1px solid var(--ln)', paddingTop: '10px' }}>
          <button
            type="button"
            onClick={() => setShowRAGChunk(!showRAGChunk)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--mu)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: 0,
            }}
          >
            <span>{showRAGChunk ? '▾ Hide bot memory representation' : '▸ Inspect anonymised bot memory chunk'}</span>
          </button>

          {showRAGChunk && (
            <div
              style={{
                marginTop: '8px',
                background: '#070707',
                border: '1px solid var(--ln)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '11px',
                color: '#cbd5e1',
                lineHeight: '1.5',
                fontFamily: 'monospace',
              }}
            >
              {knowledge.documentChunk}
              <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--mu)', fontStyle: 'italic' }}>
                🔒 Privacy guaranteed: Serial numbers, purchase costs, and user identity are excluded from bot vector memory.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Community Stats Modal */}
      {showStatsModal && (
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
            if (e.target === e.currentTarget) setShowStatsModal(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '500px',
              background: '#121212',
              border: '1px solid var(--ln)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', color: 'var(--tx)' }}>
                  📊 Real-World Community Registry Stats
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--mu)' }}>
                  Aggregated from registered player instruments{_brand ? ` (relevant to ${_brand}${_model ? ` ${_model}` : ''})` : ''}. Pure SQL analytics.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStatsModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--mu)', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Metric Tabs */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['string_gauge', 'tuning', 'bridge_pickup'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => loadCommunityStats(m)}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: selectedMetric === m ? 'var(--ac)' : '#181818',
                    color: selectedMetric === m ? '#000' : 'var(--tx)',
                    border: '1px solid var(--ln)',
                  }}
                >
                  {m === 'string_gauge' ? 'String Gauges' : m === 'tuning' ? 'Tunings' : 'Bridge Pickups'}
                </button>
              ))}
            </div>

            {/* Stats Body */}
            {statsLoading ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--mu)', fontSize: '12px' }}>
                Querying database aggregations...
              </div>
            ) : statsData && statsData.rows.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--mu)' }}>
                  Based on sample size of <b>{statsData.sampleSize}</b> registered instruments:
                </div>
                {statsData.rows.map((row, idx) => {
                  const isMatchingUser =
                    (selectedMetric === 'string_gauge' && stringGauge && row.value.includes(stringGauge)) ||
                    (selectedMetric === 'tuning' && tuning && row.value.toLowerCase() === tuning.toLowerCase());
                  return (
                    <div
                      key={idx}
                      style={{
                        background: isMatchingUser ? 'rgba(34, 197, 94, 0.08)' : '#0a0a0a',
                        border: isMatchingUser ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--ln)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--tx)' }}>
                          {row.value} {isMatchingUser && <span style={{ color: 'var(--ac)', fontSize: '10px', marginLeft: '6px' }}>★ Your Setup</span>}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 900, color: 'var(--ac)' }}>
                          {row.percentage}% ({row.count})
                        </span>
                      </div>
                      <div style={{ height: '4px', background: '#1c1c1c', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, row.percentage)}%`, height: '100%', background: 'var(--ac)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--mu)', fontSize: '12px' }}>
                No community data logged for this metric yet.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--ln)', paddingTop: '10px' }}>
              <button
                type="button"
                onClick={() => setShowStatsModal(false)}
                style={{ background: 'var(--sf)', border: '1px solid var(--ln)', color: 'var(--tx)', padding: '6px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatSlotLabel(slot: string): string {
  switch (slot) {
    case 'pickup_bridge':
      return 'Bridge Pickup';
    case 'pickup_middle':
      return 'Middle Pickup';
    case 'pickup_neck':
      return 'Neck Pickup';
    case 'strings':
      return 'Strings';
    default:
      return slot;
  }
}

