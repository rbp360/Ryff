'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { NapkinIngesterModal } from '@/components/NapkinIngesterModal';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<'gear' | 'starter'>('gear');
  
  // 3 owned + 1 want
  const [own1, setOwn1] = useState('Fender Player Stratocaster');
  const [own2, setOwn2] = useState('Boss Katana 50 MkII');
  const [own3, setOwn3] = useState('Ibanez TS9 Tube Screamer');
  const [want1, setWant1] = useState('Strymon Flint Reverb under £220');

  const [saving, setSaving] = useState(false);
  const [selectedBot, setSelectedBot] = useState<string>('robbpaul');
  const [showImportModal, setShowImportModal] = useState(false);

  const BOTS_INFO = [
    {
      id: 'robbpaul',
      name: 'RobBPaul',
      tag: 'Companion',
      archetype: 'Working Tone Pragmatist & Builder',
      desc: 'Stage-tested value, practical reliability, cuts through the mix.',
      accent: '#22c55e',
      border: 'rgba(34, 197, 94, 0.4)',
      bg: 'rgba(34, 197, 94, 0.1)',
      prompts: [
        "Is a £2k guitar really 4x better than a £500 one?",
        "What's the smartest £300 upgrade for a gigging rig?",
        "Are in-ear monitors actually ruining live stage vibe?"
      ]
    },
    {
      id: 'hank',
      name: 'Hank',
      tag: 'Luthier',
      archetype: 'Grumpy Vintage Luthier & Analog Cynic',
      desc: 'Handwired turret boards, properly cut nuts, hates marketing fluff.',
      accent: '#ea580c',
      border: 'rgba(234, 88, 12, 0.4)',
      bg: 'rgba(234, 88, 12, 0.1)',
      prompts: [
        "What's the smartest upgrade for my current rig?",
        "Is vintage gear really worth the price over modern reissues?",
        "Why is my guitar buzzing at the 12th fret?"
      ]
    },
    {
      id: 'stevie',
      name: 'Stevie',
      tag: 'Purist',
      archetype: 'Classic Tube & Blues Purist',
      desc: 'Point-to-point valve sag, nitro lacquer, dynamic picking touch.',
      accent: '#f59e0b',
      border: 'rgba(245, 158, 11, 0.4)',
      bg: 'rgba(245, 158, 11, 0.1)',
      prompts: [
        "Can digital modellers ever truly replicate tube sag?",
        "Does nitro lacquer actually let tonewood breathe?",
        "Defend heavy strings (11s+) against slinky 9s."
      ]
    },
    {
      id: 'tim',
      name: 'Tim',
      tag: 'DSP Tech',
      archetype: 'DSP Modeller & Tech Architect',
      desc: 'Impulse responses, latency benchmarks, headless ergonomics.',
      accent: '#38bdf8',
      border: 'rgba(56, 189, 248, 0.4)',
      bg: 'rgba(56, 189, 248, 0.1)',
      prompts: [
        "Pitch me the Quad Cortex over carrying a 100W valve head.",
        "How do I properly gain-stage and low-pass my IRs?",
        "Can anyone actually hear Brazilian rosewood in a dense mix?"
      ]
    },
    {
      id: 'mcgee',
      name: 'McGee',
      tag: 'High-Gain',
      archetype: 'Scrappy High-Gain Modder',
      desc: 'Pawnshop beaters, 5150 gain, chug riffs, cheap gear mods.',
      accent: '#ef4444',
      border: 'rgba(239, 68, 68, 0.4)',
      bg: 'rgba(239, 68, 68, 0.1)',
      prompts: [
        "How do I make a cheap pawnshop beater chug?",
        "What's the best budget overdrive to boost a high-gain amp?",
        "Are active pickups obsolete with modern pedals?"
      ]
    }
  ];

  const currentBotObj = BOTS_INFO.find((b) => b.id === selectedBot) || BOTS_INFO[0];

  function handleStartChat(promptText?: string) {
    if (promptText) {
      router.push(`/backstage?q=${encodeURIComponent(promptText)}&bot=${selectedBot}`);
    } else {
      router.push(`/backstage?bot=${selectedBot}`);
    }
  }

  async function handleSaveGear(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const lines = [
        own1.trim(),
        own2.trim(),
        own3.trim(),
        want1.trim() ? `Want: ${want1.trim()}` : ''
      ].filter(Boolean).join('\n');

      const res = await fetch('/api/rig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textLines: lines }),
      });

      if (res.ok) {
        setStep('starter');
      }
    } catch (err) {
      console.error('Failed to save onboarding rig:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
        
        {/* Progress Bar & Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="text-cyan-400 font-bold uppercase tracking-wider">30-Second Setup</span>
            <span>{step === 'gear' ? 'Step 1 of 2' : 'Step 2 of 2'}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-cyan-400 h-full transition-all duration-300 rounded-full"
              style={{ width: step === 'gear' ? '50%' : '100%' }}
            />
          </div>
        </div>

        {step === 'gear' ? (
          <form onSubmit={handleSaveGear} className="space-y-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>🎛️</span>
                <span>Tell Hank &amp; Vee Your Rig</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Add 3 pieces of gear you own and 1 piece you want. Hank and Vee will personalise their answers and deal searches.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  1. Your Main Guitar
                </label>
                <input
                  type="text"
                  required
                  value={own1}
                  onChange={(e) => setOwn1(e.target.value)}
                  placeholder="e.g. Fender Player Stratocaster"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  2. Your Main Amp / Modeller
                </label>
                <input
                  type="text"
                  required
                  value={own2}
                  onChange={(e) => setOwn2(e.target.value)}
                  placeholder="e.g. Boss Katana 50 MkII"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  3. Key Pedal / Gear
                </label>
                <input
                  type="text"
                  required
                  value={own3}
                  onChange={(e) => setOwn3(e.target.value)}
                  placeholder="e.g. Ibanez TS9 Tube Screamer"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div className="space-y-1 pt-1 border-t border-slate-800/80">
                <label className="text-[11px] font-mono text-amber-400 uppercase tracking-wider flex items-center justify-between">
                  <span>4. Gear You Want (With Budget)</span>
                  <span className="text-[10px] text-slate-500 lowercase font-normal">deal matcher target</span>
                </label>
                <input
                  type="text"
                  value={want1}
                  onChange={(e) => setWant1(e.target.value)}
                  placeholder="e.g. Strymon Flint under £220"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-amber-200 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-lg cursor-pointer"
            >
              {saving ? 'Saving Rig...' : 'Save & Continue →'}
            </button>

            <div className="pt-2 text-center">
              <span className="text-xs text-slate-500">or</span>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="mt-2 w-full py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📥</span>
                <span>Import notes or spreadsheet instead</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>🤖</span>
                <span>Choose Your Companion Bot</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Pick who you want as your primary gear sparring partner, or build your own custom bot.
              </p>
            </div>

            {/* Custom Bot Banner CTA */}
            <Link
              href="/onboarding/bot"
              className="block p-3.5 rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 to-slate-900 hover:border-emerald-400 text-left transition shadow-lg group text-decoration-none"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">✨</span>
                  <div>
                    <div className="text-xs font-bold text-emerald-300 group-hover:text-emerald-200">
                      Craft Your Own Personalized Bot
                    </div>
                    <div className="text-[11px] text-slate-400">
                      The Barstool Audition • 100-word player manifesto + custom gear biases
                    </div>
                  </div>
                </div>
                <span className="text-emerald-400 text-xs font-bold font-mono">Build ›</span>
              </div>
            </Link>

            {/* 5-Bot Roster Cards */}
            <div className="space-y-2">
              <span className="text-[10.5px] font-mono text-slate-400 uppercase tracking-wider">
                Or Select From The House Roster:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {BOTS_INFO.map((bot) => (
                  <button
                    key={bot.id}
                    type="button"
                    onClick={() => setSelectedBot(bot.id)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      selectedBot === bot.id
                        ? 'border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500/50'
                        : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>{bot.name}</span>
                        </span>
                        <span
                          className="text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded"
                          style={{ color: bot.accent, background: bot.bg }}
                        >
                          {bot.tag}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-400 line-clamp-2 leading-tight">
                        {bot.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Bot Recommended First Questions */}
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Recommended First Questions for {currentBotObj.name}:</span>
              </span>
              {currentBotObj.prompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleStartChat(prompt)}
                  className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-200 hover:text-emerald-300 transition flex items-center justify-between cursor-pointer"
                >
                  <span className="line-clamp-1">{prompt}</span>
                  <span className="text-slate-500 text-[10px] shrink-0 ml-2">▶</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => handleStartChat()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-lg cursor-pointer"
            >
              Enter Backstage with {currentBotObj.name} →
            </button>
          </div>
        )}

        <div className="text-center pt-2 border-t border-slate-800/80">
          <Link href="/chat" className="text-xs text-slate-500 hover:text-slate-400 transition">
            Skip to chat without setup
          </Link>
        </div>
      </div>

      <NapkinIngesterModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={() => setStep('starter')}
      />
    </main>
  );
}
