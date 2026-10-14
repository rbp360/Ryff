'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BotDossier } from '@/types/bot';

const BANTER_OPTIONS = [
  {
    id: 'Wild Renegade',
    emoji: '🎸',
    title: 'Wild Renegade',
    desc: 'Loud, loose, visceral rock street swagger; hates posers and sterile playing.',
  },
  {
    id: 'Dry & Cynical',
    emoji: '🍺',
    title: 'Dry & Cynical',
    desc: 'Skeptical of marketing hype, values real-world gigging and stage reliability.',
  },
  {
    id: 'Grumpy Purist',
    emoji: '🪵',
    title: 'Grumpy Purist',
    desc: 'Analog only, values physical repairability, turret boards, and hand craftsmanship.',
  },
  {
    id: 'Tech Realist',
    emoji: '🎛️',
    title: 'Tech Realist',
    desc: 'Pragmatic audio science, DSP modelling, IRs, and mix ergonomics.',
  },
  {
    id: 'Scrappy Modder',
    emoji: '⚡',
    title: 'Scrappy Modder',
    desc: 'Irreverent, loud, budget pawnshop beaters, DIY mods, and high gain.',
  },
];

const SLASH_EXAMPLE = {
  name: 'Sunset Renegade',
  manifesto:
    "I'm Slash, from the Sunset Strip in 1987. Bottle of Jack and a copied Les Paul is all I have to my name. Playing songs I think the Stones should've written. Don't care about the glam bands in the scene, don't care about gear hype—just want to play loud, brash, and loose. More of a blues player gone bad than an out-and-out shredder. Hate posers like Mötley Crüe.",
  gear: '1959 Derrig Les Paul replica into a cranked Marshall JCM800 / Jubilee half-stack',
  favouredPlayers: 'Keith Richards, Rory Gallagher, Gary Moore, Joe Perry, Albert King',
  dislikedPlayers: 'Mötley Crüe, 80s hair metal bands, sterile sweep-picking shredders',
  trustedSources: 'Underground live bootlegs, old vinyl records, pawnshop counter wisdom',
  distrustedSources: 'Commercial hair-metal gloss magazines, sponsored gear influencers',
  petPeeve: 'Guitarists who spend 2 hours styling their hair and zero hours practicing rhythm groove',
  bannedCliche: 'Melt faces, Shredding, Toan is in the fingers, Mojo',
  banterStyle: 'Wild Renegade',
};

export default function BotStudioPage() {
  const router = useRouter();

  // Form State
  const [botName, setBotName] = useState('');
  const [manifesto, setManifesto] = useState('');
  const [favouredGear, setFavouredGear] = useState('');
  const [favouredPlayers, setFavouredPlayers] = useState('');
  const [dislikedPlayers, setDislikedPlayers] = useState('');
  const [trustedSources, setTrustedSources] = useState('');
  const [distrustedSources, setDistrustedSources] = useState('');
  const [petPeeve, setPetPeeve] = useState('');
  const [bannedCliche, setBannedCliche] = useState('');
  const [banterStyle, setBanterStyle] = useState('Wild Renegade');

  // Compilation State
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledDossier, setCompiledDossier] = useState<BotDossier | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Word count for manifesto
  const wordCount = manifesto.trim() ? manifesto.trim().split(/\s+/).length : 0;

  function loadExample() {
    setBotName(SLASH_EXAMPLE.name);
    setManifesto(SLASH_EXAMPLE.manifesto);
    setFavouredGear(SLASH_EXAMPLE.gear);
    setFavouredPlayers(SLASH_EXAMPLE.favouredPlayers);
    setDislikedPlayers(SLASH_EXAMPLE.dislikedPlayers);
    setTrustedSources(SLASH_EXAMPLE.trustedSources);
    setDistrustedSources(SLASH_EXAMPLE.distrustedSources);
    setPetPeeve(SLASH_EXAMPLE.petPeeve);
    setBannedCliche(SLASH_EXAMPLE.bannedCliche);
    setBanterStyle(SLASH_EXAMPLE.banterStyle);
    setError(null);
  }

  async function handleCompile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsCompiling(true);

    try {
      const res = await fetch('/api/persona/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: botName.trim(),
          player_manifesto: manifesto.trim(),
          favoured_gear: favouredGear.trim(),
          favoured_players: favouredPlayers.trim(),
          disliked_players: dislikedPlayers.trim(),
          trusted_sources: trustedSources.trim(),
          distrusted_sources: distrustedSources.trim(),
          pet_peeve: petPeeve.trim(),
          banned_cliche: bannedCliche.trim(),
          banter_style: banterStyle,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to compile persona');
      }

      setCompiledDossier(data.dossier);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error compiling persona');
    } finally {
      setIsCompiling(false);
    }
  }

  async function handleSaveAndSpar() {
    if (!compiledDossier) return;
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossier: compiledDossier }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save custom bot');
      }

      // Store in localStorage as active companion fallback
      try {
        localStorage.setItem('ryff_user_bot', JSON.stringify(compiledDossier));
      } catch {
        // ignore storage errors
      }

      router.push(`/backstage?bot=${compiledDossier.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving bot');
      setIsSaving(false);
    }
  }

  function handleDownloadJson() {
    if (!compiledDossier) return;
    const jsonStr = JSON.stringify(compiledDossier, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${compiledDossier.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_dossier.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--tx)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header
        style={{
          borderBottom: '1px solid var(--ln)',
          background: 'rgba(5,5,5,0.92)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '960px',
            margin: '0 auto',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/onboarding" style={{ color: 'var(--mu)', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
              ← Back to Onboarding
            </Link>
            <span style={{ color: 'var(--ln)' }}>|</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ac)', letterSpacing: '0.04em' }}>
              BOT CREATION STUDIO
            </span>
          </div>

          <button
            type="button"
            onClick={loadExample}
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#000',
              background: 'var(--ac)',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            ⚡ Load 1987 Sunset Example
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: '960px', width: '100%', margin: '0 auto', padding: '36px 20px 80px' }}>
        {/* Intro Hero */}
        <section style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 40px' }}>
          <div
            style={{
              display: 'inline-block',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--ac)',
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.25)',
              padding: '4px 12px',
              borderRadius: '20px',
              marginBottom: '16px',
            }}
          >
            The Barstool Audition (Milestone M7.4)
          </div>
          <h1
            style={{
              fontSize: 'clamp(28px, 4.5vw, 44px)',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              fontFamily: 'var(--font-display)',
              lineHeight: 1.1,
              marginBottom: '12px',
            }}
          >
            Build Your Personal Companion Bot
          </h1>
          <p style={{ fontSize: '15px', color: '#bbb', lineHeight: 1.55 }}>
            No stiff slogans, no generic cheerleading. Tell us who you are or what kind of player you want to debate with, and Gemini will compile an authentic, technical gear character.
          </p>
        </section>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#f87171',
              fontSize: '13px',
              marginBottom: '24px',
            }}
          >
            {error}
          </div>
        )}

        {/* Studio Grid: Left Form, Right Reveal Preview */}
        <div style={{ display: 'grid', gridTemplateColumns: compiledDossier ? '1fr 1fr' : '1fr', gap: '32px', alignItems: 'start' }}>
          {/* QUESTIONNAIRE FORM */}
          <form
            onSubmit={handleCompile}
            style={{
              background: 'var(--sf)',
              border: '1px solid var(--ln)',
              borderRadius: 'var(--r)',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '22px',
            }}
          >
            {/* 1. Bot Name */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ac)', marginBottom: '6px' }}>
                1. Bot Character Name
              </label>
              <input
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="e.g. Sunset Renegade, Benchtop Pete, Rory's Ghost"
                style={{
                  width: '100%',
                  background: '#090909',
                  border: '1px solid var(--ln)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  color: '#fff',
                  outline: 'none',
                }}
              />
            </div>

            {/* 2. The 100-Word Player Manifesto */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ac)' }}>
                  2. Player Ethos / Manifesto (~100 Words)
                </label>
                <span style={{ fontSize: '11px', color: wordCount > 120 ? '#ef4444' : 'var(--mu)', fontWeight: 600 }}>
                  {wordCount} words
                </span>
              </div>
              <textarea
                rows={4}
                required
                value={manifesto}
                onChange={(e) => setManifesto(e.target.value)}
                placeholder="Describe what kind of player your bot is (or write about yourself!). E.g.: 'I'm Slash, 1987 Sunset strip. Copied Les Paul, bottle of Jack, playing songs I think the Stones should've written. Don't care about gear hype, just want loud and loose blues rock. Hate posers like Mötley Crüe.'"
                style={{
                  width: '100%',
                  background: '#090909',
                  border: '1px solid var(--ln)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  fontSize: '13.5px',
                  color: '#fff',
                  lineHeight: 1.5,
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--mu)', display: 'block', marginTop: '4px' }}>
                AI extracts temperament, sarcasm, attitude dials, and technical debate anchors from this paragraph.
              </span>
            </div>

            {/* 3. Number One Rig */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--mu)', marginBottom: '6px' }}>
                3. Number One Rig &amp; Favoured Gear
              </label>
              <input
                type="text"
                required
                value={favouredGear}
                onChange={(e) => setFavouredGear(e.target.value)}
                placeholder="e.g. 1959 Les Paul replica, Marshall JCM800, Celestion Greenbacks"
                style={{
                  width: '100%',
                  background: '#090909',
                  border: '1px solid var(--ln)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '13.5px',
                  color: '#fff',
                  outline: 'none',
                }}
              />
            </div>

            {/* 4. Influences & Heroes */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--mu)', marginBottom: '6px' }}>
                4. Guitar Heroes &amp; Admired Players
              </label>
              <input
                type="text"
                value={favouredPlayers}
                onChange={(e) => setFavouredPlayers(e.target.value)}
                placeholder="e.g. Keith Richards, Gary Moore, Rory Gallagher, Duane Allman"
                style={{
                  width: '100%',
                  background: '#090909',
                  border: '1px solid var(--ln)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '13.5px',
                  color: '#fff',
                  outline: 'none',
                }}
              />
            </div>

            {/* 5. Disliked Players / Posers */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--mu)', marginBottom: '6px' }}>
                5. Disliked Players, Posers, or Overrated Scenes
              </label>
              <input
                type="text"
                value={dislikedPlayers}
                onChange={(e) => setDislikedPlayers(e.target.value)}
                placeholder="e.g. Mötley Crüe, 80s hair metal bands, sterile YouTube shredders"
                style={{
                  width: '100%',
                  background: '#090909',
                  border: '1px solid var(--ln)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '13.5px',
                  color: '#fff',
                  outline: 'none',
                }}
              />
            </div>

            {/* 6. Trusted vs Distrusted Sources */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--mu)', marginBottom: '6px' }}>
                  Trusted Channels / Sites
                </label>
                <input
                  type="text"
                  value={trustedSources}
                  onChange={(e) => setTrustedSources(e.target.value)}
                  placeholder="e.g. That Pedal Show, Premier Guitar"
                  style={{
                    width: '100%',
                    background: '#090909',
                    border: '1px solid var(--ln)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: '#fff',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--mu)', marginBottom: '6px' }}>
                  Distrusted / Hype Channels
                </label>
                <input
                  type="text"
                  value={distrustedSources}
                  onChange={(e) => setDistrustedSources(e.target.value)}
                  placeholder="e.g. Clickbait vloggers, PR reviews"
                  style={{
                    width: '100%',
                    background: '#090909',
                    border: '1px solid var(--ln)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: '#fff',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* 7. Pet Peeve & Hill to Die On */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--mu)', marginBottom: '6px' }}>
                6. Pet Peeve &amp; Hill to Die On
              </label>
              <input
                type="text"
                required
                value={petPeeve}
                onChange={(e) => setPetPeeve(e.target.value)}
                placeholder="e.g. £5k relic guitars that never leave the bedroom, plastic PCB pots"
                style={{
                  width: '100%',
                  background: '#090909',
                  border: '1px solid var(--ln)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '13.5px',
                  color: '#fff',
                  outline: 'none',
                }}
              />
            </div>

            {/* 8. Banned Cliché */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--mu)', marginBottom: '6px' }}>
                7. Cliché Your Bot Would Never Say
              </label>
              <input
                type="text"
                value={bannedCliche}
                onChange={(e) => setBannedCliche(e.target.value)}
                placeholder="e.g. Toan is in the fingers, Mojo, Melt faces, Shredding"
                style={{
                  width: '100%',
                  background: '#090909',
                  border: '1px solid var(--ln)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '13.5px',
                  color: '#fff',
                  outline: 'none',
                }}
              />
            </div>

            {/* 9. Banter Style Pills */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--mu)', marginBottom: '8px' }}>
                8. Attitude / Banter Dial
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                {BANTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setBanterStyle(opt.id)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: banterStyle === opt.id ? '1px solid var(--ac)' : '1px solid var(--ln)',
                      background: banterStyle === opt.id ? 'rgba(34,197,94,0.1)' : '#090909',
                      color: banterStyle === opt.id ? '#fff' : 'var(--mu)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontSize: '14px', marginBottom: '2px' }}>{opt.emoji}</div>
                    <div style={{ fontSize: '11.5px', fontWeight: 800 }}>{opt.title}</div>
                    <div style={{ fontSize: '9.5px', color: 'var(--mu)', marginTop: '2px', lineHeight: 1.2 }}>
                      {opt.desc.substring(0, 45)}...
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isCompiling}
              style={{
                width: '100%',
                background: 'var(--ac)',
                color: '#000',
                border: 'none',
                borderRadius: '10px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 900,
                cursor: isCompiling ? 'not-allowed' : 'pointer',
                opacity: isCompiling ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(34,197,94,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isCompiling ? (
                <>
                  <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⚙️</span>
                  <span>Compiling Persona with Gemini AI...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Compile Bot Character Dossier</span>
                </>
              )}
            </button>
          </form>

          {/* COMPILED REVEAL CARD */}
          {compiledDossier && (
            <div
              style={{
                background: '#080808',
                border: '1px solid rgba(34,197,94,0.4)',
                borderRadius: 'var(--r)',
                padding: '28px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.8), 0 0 30px rgba(34,197,94,0.08)',
                position: 'sticky',
                top: '90px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--ac)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Character Card Compiled
                </span>
                <span style={{ fontSize: '10px', padding: '3px 8px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', color: 'var(--mu)' }}>
                  Milestone M7.4 Validated
                </span>
              </div>

              {/* Character Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #15803d, #14532d)',
                    border: '2px solid var(--ac)',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '18px',
                    fontWeight: 900,
                    color: '#fff',
                  }}
                >
                  {compiledDossier.avatarText || 'UB'}
                </div>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>
                    {compiledDossier.name}
                  </h2>
                  <div style={{ fontSize: '12px', color: 'var(--ac)', fontWeight: 700, marginTop: '2px' }}>
                    {compiledDossier.archetype}
                  </div>
                </div>
              </div>

              {/* Attitude Dials */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--ln)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--mu)', textTransform: 'uppercase', fontWeight: 800 }}>
                    Temperature Dial
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#fff' }}>
                    {compiledDossier.temperature}
                    <span style={{ fontSize: '11px', color: 'var(--mu)', fontWeight: 400 }}> / 1.0</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--mu)', textTransform: 'uppercase', fontWeight: 800 }}>
                    Pushback Rate
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--ac)' }}>
                    {Math.round(compiledDossier.disagreement_rate * 100)}%
                  </div>
                </div>
              </div>

              {/* Hill to Die On */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--mu)', marginBottom: '4px' }}>
                  Stubborn Hill to Die On
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: '#e2e8f0',
                    fontStyle: 'italic',
                    padding: '10px 14px',
                    background: '#090909',
                    borderLeft: '3px solid var(--ac)',
                    borderRadius: '0 6px 6px 0',
                    lineHeight: 1.45,
                  }}
                >
                  &ldquo;{compiledDossier.irrational_hill_to_die_on}&rdquo;
                </div>
              </div>

              {/* Sample Technical Argument Lines */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--mu)', marginBottom: '8px' }}>
                  Generated Technical Debate Lines
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {compiledDossier.sample_lines.map((line, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: '12.5px',
                        color: '#cbd5e1',
                        padding: '10px 12px',
                        background: '#0a0a0a',
                        border: '1px solid var(--ln)',
                        borderRadius: '6px',
                        lineHeight: 1.4,
                      }}
                    >
                      &ldquo;{line}&rdquo;
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleSaveAndSpar}
                  disabled={isSaving}
                  style={{
                    width: '100%',
                    background: 'var(--ac)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '13px',
                    fontSize: '14px',
                    fontWeight: 900,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.7 : 1,
                  }}
                >
                  {isSaving ? 'Saving to Roster...' : 'Save & Spar in Backstage →'}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadJson}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    color: 'var(--mu)',
                    border: '1px solid var(--ln)',
                    borderRadius: '8px',
                    padding: '9px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  📥 Export .json Character File
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
