import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">Sign In to GuitarBot</h1>
          <p className="text-sm text-slate-400">Enter your invite code and email to continue</p>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Invite Code</label>
            <input
              type="text"
              placeholder="CADRE-XXXX"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500 uppercase font-mono"
            />
          </div>

          <button
            type="button"
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 rounded-lg text-sm transition shadow-md"
          >
            Sign In
          </button>
        </form>

        <div className="text-center pt-2">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-400 transition">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
