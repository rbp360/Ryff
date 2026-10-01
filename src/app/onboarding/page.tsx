'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<'gear' | 'starter'>('gear');
  
  // 3 owned + 1 want
  const [own1, setOwn1] = useState('Fender Player Stratocaster');
  const [own2, setOwn2] = useState('Boss Katana 50 MkII');
  const [own3, setOwn3] = useState('Ibanez TS9 Tube Screamer');
  const [want1, setWant1] = useState('Strymon Flint Reverb under £220');

  const [saving, setSaving] = useState(false);
  const [selectedBot, setSelectedBot] = useState<'hank' | 'vee'>('hank');

  const STARTER_PROMPTS = {
    hank: [
      "What's the smartest upgrade for my current rig?",
      "What do you think of today's top story?",
      "Is vintage gear really worth the price over modern reissues?"
    ],
    vee: [
      "Are there any good used deals for my wishlist right now?",
      "How would you optimize my signal chain for gigging?",
      "What's the best budget pedal released this month?"
    ]
  };

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

  function handleStartChat(promptText?: string) {
    if (promptText) {
      router.push(`/chat?q=${encodeURIComponent(promptText)}&bot=${selectedBot}`);
    } else {
      router.push(`/chat?bot=${selectedBot}`);
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
          </form>
        ) : (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>💬</span>
                <span>Choose Your First Question</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Pick who you want to talk to first and select a starting prompt.
              </p>
            </div>

            {/* Persona Tabs */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedBot('hank')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  selectedBot === 'hank'
                    ? 'bg-amber-950/40 border-amber-500 text-amber-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <span>🧔</span>
                  <span>Hank</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Grumpy Luthier • Tonewoods &amp; Vintage</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedBot('vee')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  selectedBot === 'vee'
                    ? 'bg-cyan-950/40 border-cyan-500 text-cyan-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <span>⚡</span>
                  <span>Vee</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Deal Hunter • Modellers &amp; Modern Value</p>
              </button>
            </div>

            {/* Suggested Starter Prompts */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Recommended First Questions:
              </span>
              {STARTER_PROMPTS[selectedBot].map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleStartChat(prompt)}
                  className="w-full text-left p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-200 hover:text-cyan-300 transition flex items-center justify-between cursor-pointer"
                >
                  <span>{prompt}</span>
                  <span className="text-slate-500 text-[10px]">▶</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => handleStartChat()}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-lg cursor-pointer"
            >
              Enter Private Chat Room →
            </button>
          </div>
        )}

        <div className="text-center pt-2 border-t border-slate-800/80">
          <Link href="/chat" className="text-xs text-slate-500 hover:text-slate-400 transition">
            Skip to chat without setup
          </Link>
        </div>
      </div>
    </main>
  );
}
