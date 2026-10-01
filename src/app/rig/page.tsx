'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface RigItem {
  id: string | number;
  raw_text: string;
  brand: string | null;
  model: string | null;
  category: string;
  kind: 'own' | 'want';
  budget_gbp: number | null;
  want_key: string | null;
}

export default function RigPage() {
  const [items, setItems] = useState<RigItem[]>([]);
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchRig();
  }, []);

  async function fetchRig() {
    setLoading(true);
    try {
      const res = await fetch('/api/rig');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        // Populate textarea with existing items formatted
        if (data.items?.length) {
          const lines = data.items.map((i: RigItem) => {
            if (i.kind === 'want') {
              const budget = i.budget_gbp ? ` under £${i.budget_gbp}` : '';
              return `Want: ${i.brand ? i.brand + ' ' : ''}${i.model || i.raw_text}${budget}`;
            }
            return `${i.brand ? i.brand + ' ' : ''}${i.model || i.raw_text}`;
          });
          setTextInput(lines.join('\n'));
        }
      }
    } catch (err) {
      console.error('Failed to load rig:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/rig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textLines: textInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save rig');
      }

      setItems(data.items || []);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save rig');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string | number) {
    try {
      const res = await fetch(`/api/rig?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(items.filter((i) => i.id !== id));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  }

  const ownedItems = items.filter((i) => i.kind === 'own');
  const wantItems = items.filter((i) => i.kind === 'want');

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🎸</span>
              <h1 className="text-2xl font-bold text-white tracking-tight">Your Rig & Wants</h1>
            </div>
            <p className="text-sm text-slate-400">
              Hank & Vee use your gear list to tailor daily debate opinions and find pre-matched used deals.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition shadow-md flex items-center gap-2"
            >
              <span>💬</span>
              <span>Open Chat with Hank & Vee</span>
            </Link>
            <Link
              href="/"
              className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs px-3.5 py-2.5 rounded-lg transition"
            >
              Today&apos;s Debate
            </Link>
          </div>
        </header>

        {/* Notifications */}
        {error && (
          <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl text-sm text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-xl text-sm text-emerald-300 flex items-center gap-2">
            <span>✓</span> Rig and wants saved successfully! Hank & Vee now know your gear.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Editor Form Column */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-white">Enter Gear (Free-Text)</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter 1 item per line. Prefix items you are searching for with <code className="text-cyan-400 bg-slate-950 px-1 py-0.5 rounded">Want:</code> or <code className="text-cyan-400 bg-slate-950 px-1 py-0.5 rounded">Looking for:</code> and include your budget (e.g. <code className="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded">under £300</code>).
                </p>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <textarea
                  rows={10}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={`Fender Player Stratocaster\nBoss Katana 50 MkII\nBoss TU-2 Tuner\nWant: Squier Classic Vibe Telecaster under £300\nWant: Tube Screamer TS9 under £80`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-slate-200 text-sm font-mono leading-relaxed focus:outline-none focus:border-cyan-500 transition"
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Max 30 items
                  </span>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-xs px-5 py-2.5 rounded-lg transition shadow-md cursor-pointer"
                  >
                    {saving ? 'Parsing & Saving...' : 'Parse & Save Rig'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Current Rig Breakdown Column */}
          <div className="lg:col-span-6 space-y-6">
            {/* Owned Gear Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-sm">🎸</span>
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Gear in Your Rig ({ownedItems.length})</h2>
                </div>
              </div>

              {loading ? (
                <p className="text-xs text-slate-500 py-4 text-center">Loading your gear...</p>
              ) : ownedItems.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center italic">No owned gear logged yet. Add your guitar, amp, or pedals on the left.</p>
              ) : (
                <ul className="space-y-2.5">
                  {ownedItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800/80 rounded-lg text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-200">
                          {item.brand ? <span className="text-cyan-400 mr-1.5">{item.brand}</span> : null}
                          {item.model || item.raw_text}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-900 text-slate-400 px-2 py-0.5 rounded text-[10px] uppercase font-mono">
                            {item.category}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-slate-500 hover:text-red-400 p-1 transition"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Wanted Gear Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-sm">🎯</span>
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Wants & Deal Targets ({wantItems.length})</h2>
                </div>
              </div>

              {loading ? (
                <p className="text-xs text-slate-500 py-4 text-center">Loading wants...</p>
              ) : wantItems.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center italic">No wants tracked yet. Add items starting with &apos;Want:&apos; on the left.</p>
              ) : (
                <ul className="space-y-2.5">
                  {wantItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-slate-950 border border-amber-950/40 rounded-lg text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-200">
                          {item.brand ? <span className="text-amber-400 mr-1.5">{item.brand}</span> : null}
                          {item.model || item.raw_text}
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="bg-slate-900 text-slate-400 px-2 py-0.5 rounded uppercase font-mono">
                            {item.category}
                          </span>
                          {item.budget_gbp && (
                            <span className="bg-emerald-950/70 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded font-mono">
                              Budget: £{item.budget_gbp}
                            </span>
                          )}
                          {item.want_key && (
                            <span className="text-slate-500 font-mono">
                              Key: {item.want_key}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-slate-500 hover:text-red-400 p-1 transition"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
