'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SetupClientProps {
  initialEmail: string;
  initialPreferences: {
    favoritePlayers: string[];
    followedBrands: string[];
    reverbRegion: 'UK_ONLY' | 'SHIPS_TO_UK' | 'US_ONLY' | 'WORLDWIDE';
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
  const [interests, setInterests] = useState<string[]>(
    initialPreferences.followedBrands.length > 0 ? initialPreferences.followedBrands : ['Marshall', 'Tube amps', 'Pedals']
  );
  const [sources, setSources] = useState<Record<string, boolean>>({
    news: true,
    youtube: true,
    deals: true,
    forums: true,
  });
  const [region, setRegion] = useState(initialPreferences.reverbRegion || 'SHIPS_TO_UK');
  const [savedNotice, setSavedNotice] = useState(false);

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

  function toggleInterest(item: string) {
    const next = interests.includes(item)
      ? interests.filter((x) => x !== item)
      : [...interests, item];
    setInterests(next);
    syncPreferences(next, region);
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
    syncPreferences(interests, newRegion);
  }

  async function syncPreferences(newInterests: string[], newRegion: 'UK_ONLY' | 'SHIPS_TO_UK' | 'US_ONLY' | 'WORLDWIDE') {
    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followedBrands: newInterests,
          reverbRegion: newRegion,
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
        <Link href="/" className="back">
          ‹ Home
        </Link>
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

      {/* 2. Interests & Brands */}
      <div className="card">
        <h3>You like</h3>
        <p>Tap to shape what stories and gear Ryff prioritizes.</p>
        <div className="chips">
          {DEFAULT_INTERESTS.map((item) => (
            <button
              key={item}
              type="button"
              className={`chip ${interests.includes(item) ? 'on' : ''}`}
              onClick={() => toggleInterest(item)}
            >
              {item}
            </button>
          ))}
        </div>
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

      {/* 5. Account Management */}
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
