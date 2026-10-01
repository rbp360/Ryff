'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isAdult, setIsAdult] = useState(false);
  const [consent, setConsent] = useState(false);
  const [ukResident, setUkResident] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, inviteCode, isAdult, consent, ukResident }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Sign in failed');
      }

      router.push('/onboarding');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDevBypass() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDevLogin: true, inviteCode: 'CADRE-DEV01' }),
      });
      if (res.ok) {
        router.push('/chat');
      } else {
        const data = await res.json();
        setError(data.error || 'Dev login failed');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Dev login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-black text-xl mb-2">
            🎸
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sign In to GuitarBot</h1>
          <p className="text-sm text-slate-400">Enter your private invite code to access Hank & Vee</p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Invite Code</label>
            <input
              type="text"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="CADRE-XXXX"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500 uppercase font-mono tracking-wider transition"
            />
          </div>

          <div className="space-y-2 pt-1 text-xs text-slate-400">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={isAdult}
                onChange={(e) => setIsAdult(e.target.checked)}
                className="mt-0.5 rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0"
              />
              <span>I confirm I am 18 years of age or older.</span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0"
              />
              <span>
                I agree to the <Link href="/legal/terms" className="text-cyan-400 underline hover:text-cyan-300">Terms</Link> and <Link href="/legal/privacy" className="text-cyan-400 underline hover:text-cyan-300">Privacy Notice</Link>.
              </span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={ukResident}
                onChange={(e) => setUkResident(e.target.checked)}
                className="mt-0.5 rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0"
              />
              <span>I am resident in the United Kingdom.</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition shadow-md cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="pt-3 border-t border-slate-800/80 text-center space-y-3">
          <button
            type="button"
            onClick={handleDevBypass}
            disabled={loading}
            className="w-full bg-slate-800/80 hover:bg-slate-700/80 text-cyan-300 border border-slate-700 text-xs py-2 px-3 rounded-lg transition"
          >
            ⚡ One-Click Dev / Test Login (No code needed)
          </button>

          <div>
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-400 transition">
              ← Back to Daily Debate
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
