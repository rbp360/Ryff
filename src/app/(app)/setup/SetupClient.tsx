'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BackButton } from '@/components/BackButton';


interface SetupClientProps {
  initialEmail: string;
  initialPreferences: {
    favoritePlayers: string[];
    followedBrands: string[];
    reverbRegion: 'UK_ONLY' | 'SHIPS_TO_UK' | 'US_ONLY' | 'WORLDWIDE';
    commandInputMode?: 'text_and_voice' | 'text_only' | 'off';
  };
}

const DEFAULT_INTERESTS = [
  'Marshall',
  'Fender',
  'Gibson',
  'Boss',
  'Tube amps',
  'Pedals',
  'Vintage',
  'Modelling',
  'Soldano',
  'PRS',
];

const SOURCES_LIST = [
  { id: 'news', label: 'Guitar news (Premier Guitar, Guitar World)' },
  { id: 'youtube', label: 'YouTube reviews & demos' },
  { id: 'deals', label: 'Used gear marketplaces (Reverb)' },
  { id: 'forums', label: 'Discussion & forums (The Gear Page)' },
];

export function SetupClient({ initialEmail, initialPreferences }: SetupClientProps) {
  const [tone, setTone] = useState<'Dry' | 'Blunt' | 'Chatty'>('Dry');
  const [players, setPlayers] = useState<string[]>(initialPreferences.favoritePlayers || []);
  const [playerInput, setPlayerInput] = useState('');
  const [brands, setBrands] = useState<string[]>(
    initialPreferences.followedBrands.length > 0 ? initialPreferences.followedBrands : ['Marshall', 'Tube amps', 'Pedals']
  );
  const [brandInput, setBrandInput] = useState('');
  const [sources, setSources] = useState<Record<string, boolean>>({
    news: true,
    youtube: true,
    deals: true,
    forums: true,
  });
  const [region, setRegion] = useState(initialPreferences.reverbRegion || 'SHIPS_TO_UK');
  const [commandMode, setCommandMode] = useState<'text_and_voice' | 'text_only' | 'off'>(
    initialPreferences.commandInputMode || 'text_and_voice'
  );
  const [savedNotice, setSavedNotice] = useState(false);

  // Assistant activity state (Step 3)
  const [activity, setActivity] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [undoingId, setUndoingId] = useState<number | null>(null);

  // Load assistant activity
  useEffect(() => {
    fetchActivity();
  }, []);

  async function fetchActivity() {
    setLoadingActivity(true);
    try {
      const res = await fetch('/api/command/activity?limit=10');
      const data = await res.json();
      if (res.ok) {
        setActivity(data.activity || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingActivity(false);
    }
  }

  async function handleUndoActivity(actionId: number) {
    setUndoingId(actionId);
    try {
      const res = await fetch('/api/command/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId }),
      });
      if (res.ok) {
        setActivity((prev) =>
          prev.map((a) => (a.id === actionId ? { ...a, status: 'undone' } : a))
        );
      }
    } catch {
      // Ignore
    } finally {
      setUndoingId(null);
    }
  }

  // Load local tone & sources
  useEffect(() => {
    try {
      const savedTone = localStorage.getItem('ryff_tone');
      if (savedTone === 'Dry' || savedTone === 'Blunt' || savedTone === 'Chatty') {
        setTone(savedTone);
      }
      const savedSources = localStorage.getItem('ryff_sources');
      if (savedSources) {
        setSources(JSON.parse(savedSources));
      }
    } catch {
      // Local storage unavailable
    }
  }, []);

  function handleToneChange(newTone: 'Dry' | 'Blunt' | 'Chatty') {
    setTone(newTone);
    try {
      localStorage.setItem('ryff_tone', newTone);
    } catch {
      // Ignore
    }
    flashNotice();
  }

  function addPlayer() {
    const trimmed = playerInput.trim();
    if (trimmed && !players.includes(trimmed)) {
      const next = [...players, trimmed];
      setPlayers(next);
      setPlayerInput('');
      syncPreferences(next, brands, region);
    }
  }

  function removePlayer(name: string) {
    const next = players.filter((p) => p !== name);
    setPlayers(next);
    syncPreferences(next, brands, region);
  }

  function togglePresetBrand(item: string) {
    const next = brands.includes(item)
      ? brands.filter((x) => x !== item)
      : [...brands, item];
    setBrands(next);
    syncPreferences(players, next, region);
  }

  function addBrand() {
    const trimmed = brandInput.trim();
    if (trimmed && !brands.includes(trimmed)) {
      const next = [...brands, trimmed];
      setBrands(next);
      setBrandInput('');
      syncPreferences(players, next, region);
    }
  }

  function removeBrand(name: string) {
    const next = brands.filter((b) => b !== name);
    setBrands(next);
    syncPreferences(players, next, region);
  }

  function toggleSource(id: string) {
    const next = { ...sources, [id]: !sources[id] };
    setSources(next);
    try {
      localStorage.setItem('ryff_sources', JSON.stringify(next));
    } catch {
      // Ignore
    }
    flashNotice();
  }

  async function handleRegionChange(newRegion: 'UK_ONLY' | 'SHIPS_TO_UK' | 'US_ONLY' | 'WORLDWIDE') {
    setRegion(newRegion);
    syncPreferences(players, brands, newRegion, commandMode);
  }

  async function handleCommandModeChange(newMode: 'text_and_voice' | 'text_only' | 'off') {
    setCommandMode(newMode);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ryff_command_mode_changed', { detail: newMode }));
    }
    syncPreferences(players, brands, region, newMode);
  }

  async function syncPreferences(
    newPlayers: string[],
    newBrands: string[],
    newRegion: 'UK_ONLY' | 'SHIPS_TO_UK' | 'US_ONLY' | 'WORLDWIDE',
    newCommandMode: 'text_and_voice' | 'text_only' | 'off' = commandMode
  ) {
    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          favoritePlayers: newPlayers,
          followedBrands: newBrands,
          reverbRegion: newRegion,
          commandInputMode: newCommandMode,
        }),
      });
      flashNotice();
    } catch {
      // Sync failed
    }
  }

  function flashNotice() {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackButton fallbackHref="/" label="Home" />
        {savedNotice && (
          <span style={{ fontSize: '11px', color: 'var(--ac)', fontWeight: 800 }}>
            ✓ Preferences saved
          </span>
        )}
      </div>

      <h1 style={{ marginTop: '16px' }}>Setup</h1>
      <p className="sub">Shape what Ryff looks for and how it talks.</p>

      {/* 1. Personality */}
      <div className="card">
        <h3>Personality</h3>
        <p>How Hank and Vee argue and summarize gear.</p>
        <div className="seg">
          {(['Dry', 'Blunt', 'Chatty'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={tone === t ? 'on' : ''}
              onClick={() => handleToneChange(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Favorite Artists & Guitarists */}
      <div className="card">
        <h3>Favorite Artists & Guitarists</h3>
        <p style={{ marginBottom: '12px' }}>
          Add musicians or artists you follow (e.g. Chris Impellitteri, Nita Strauss, Slash). News mentioning them gets boosted.
        </p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            value={playerInput}
            onChange={(e) => setPlayerInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPlayer())}
            placeholder="e.g. Chris Impellitteri, Slash..."
            style={{
              flex: 1,
              background: '#0a0a0a',
              border: '1px solid var(--ln)',
              color: 'var(--tx)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={addPlayer}
            style={{
              background: 'var(--ac)',
              color: '#000',
              fontWeight: 800,
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Add
          </button>
        </div>
        {players.length > 0 ? (
          <div className="chips">
            {players.map((p) => (
              <span
                key={p}
                className="chip on"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span>{p}</span>
                <button
                  type="button"
                  onClick={() => removePlayer(p)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--tx)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    lineHeight: 1,
                    padding: 0,
                  }}
                  aria-label={`Remove ${p}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        ) : (
          <small style={{ color: 'var(--mu)', fontStyle: 'italic' }}>
            No custom artists added yet. Type an artist name above to track news about them!
          </small>
        )}
      </div>

      {/* 3. Followed Brands & Topics */}
      <div className="card">
        <h3>Followed Brands & Topics</h3>
        <p style={{ marginBottom: '12px' }}>Tap presets or add custom brands to shape what stories Ryff prioritizes.</p>

        <div className="chips" style={{ marginBottom: '12px' }}>
          {DEFAULT_INTERESTS.map((item) => (
            <button
              key={item}
              type="button"
              className={`chip ${brands.includes(item) ? 'on' : ''}`}
              onClick={() => togglePresetBrand(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            value={brandInput}
            onChange={(e) => setBrandInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBrand())}
            placeholder="Add custom brand or topic..."
            style={{
              flex: 1,
              background: '#0a0a0a',
              border: '1px solid var(--ln)',
              color: 'var(--tx)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={addBrand}
            style={{
              background: 'var(--ac)',
              color: '#000',
              fontWeight: 800,
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Add
          </button>
        </div>

        {brands.filter((b) => !DEFAULT_INTERESTS.includes(b)).length > 0 && (
          <div className="chips">
            {brands
              .filter((b) => !DEFAULT_INTERESTS.includes(b))
              .map((b) => (
                <span
                  key={b}
                  className="chip on"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>{b}</span>
                  <button
                    type="button"
                    onClick={() => removeBrand(b)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--tx)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      lineHeight: 1,
                      padding: 0,
                    }}
                    aria-label={`Remove ${b}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
          </div>
        )}
      </div>

      {/* 3. Ingestion Sources */}
      <div className="card">
        <h3>Sources</h3>
        <p>Active feed ingestion categories.</p>
        {SOURCES_LIST.map((s) => (
          <div key={s.id} className="row">
            <span>{s.label}</span>
            <button
              type="button"
              className={`tg ${sources[s.id] ? 'on' : ''}`}
              onClick={() => toggleSource(s.id)}
              aria-label={`Toggle ${s.label}`}
            />
          </div>
        ))}
      </div>

      {/* 4. Trader Alerts & Region */}
      <div className="card">
        <h3>Trader alerts</h3>
        <p>Used gear matching your wants list.</p>
        <div className="row">
          <span>Search region</span>
          <select
            value={region}
            onChange={(e) => handleRegionChange(e.target.value as 'UK_ONLY' | 'SHIPS_TO_UK' | 'US_ONLY' | 'WORLDWIDE')}
            style={{
              background: '#000',
              color: 'var(--tx)',
              border: '1px solid var(--ln)',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            <option value="UK_ONLY">UK Only</option>
            <option value="SHIPS_TO_UK">Ships to UK</option>
            <option value="US_ONLY">US Only</option>
            <option value="WORLDWIDE">Worldwide</option>
          </select>
        </div>
        <div className="row">
          <span>Market scan</span>
          <b style={{ color: 'var(--ac)' }}>Twice daily (06:30 & 18:30)</b>
        </div>
      </div>

      {/* 5. Command Input Mode */}
      <div className="card">
        <h3>Command input</h3>
        <p>Global assistant input available across all screens to log gear, maintenance, and ask questions.</p>
        <div className="row" style={{ borderBottom: 0, paddingBottom: 0 }}>
          <span>Input mode</span>
          <select
            value={commandMode}
            onChange={(e) => handleCommandModeChange(e.target.value as 'text_and_voice' | 'text_only' | 'off')}
            style={{
              background: '#000',
              color: 'var(--tx)',
              border: '1px solid var(--ln)',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            <option value="text_and_voice">Text and voice (Default)</option>
            <option value="text_only">Text only</option>
            <option value="off">Off</option>
          </select>
        </div>
      </div>

      {/* 6. Assistant Activity (Step 3) */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3>Assistant activity</h3>
            <p>Recent commands and recorded maintenance or wants.</p>
          </div>
          <button
            type="button"
            onClick={fetchActivity}
            disabled={loadingActivity}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--ln)',
              color: 'var(--mu)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {loadingActivity ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>

        {activity.length === 0 ? (
          <div style={{ padding: '16px 0', fontSize: '12.5px', color: 'var(--mu)', textAlign: 'center' }}>
            No assistant actions recorded yet. Use the ⚡ Tell Ryff button to log gear or wants.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            {activity.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--ln)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background:
                          item.status === 'confirmed'
                            ? 'rgba(16, 185, 129, 0.2)'
                            : item.status === 'undone'
                            ? 'rgba(245, 158, 11, 0.2)'
                            : 'rgba(255, 255, 255, 0.1)',
                        color:
                          item.status === 'confirmed'
                            ? '#34d399'
                            : item.status === 'undone'
                            ? '#fbbf24'
                            : 'var(--mu)',
                      }}
                    >
                      {item.status.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--mu)' }}>
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                    &ldquo;{item.source_text}&rdquo;
                  </span>
                  <span style={{ fontSize: '11.5px', color: 'var(--mu)' }}>
                    {item.result?.summary || item.result?.title || item.tool_name}
                  </span>
                </div>

                {item.status === 'confirmed' && (
                  <button
                    type="button"
                    onClick={() => handleUndoActivity(item.id)}
                    disabled={undoingId === item.id}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid #ef4444',
                      color: '#f87171',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {undoingId === item.id ? 'Reversing...' : 'Undo'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7. Account Management */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h3>Account</h3>
        <p>Manage your login session.</p>
        <div className="row">
          <span>Logged in as</span>
          <b style={{ fontSize: '12px' }}>{initialEmail}</b>
        </div>
        <div className="row" style={{ borderBottom: 0, paddingBottom: 0 }}>
          <span>Session</span>
          <Link
            href="/login"
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--ac)',
              textDecoration: 'underline',
            }}
          >
            Switch Account / Sign In
          </Link>
        </div>
      </div>
    </>
  );
}
