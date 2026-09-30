import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-2xl text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          GuitarBot MVP v2.5
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
          Hank & Vee Guitar News Network
        </h1>

        <p className="text-slate-400 text-base leading-relaxed">
          AI-generated fictional gear commentators arguing daily about news, launches, and used-market bargains.
        </p>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/admin"
            className="px-6 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-lg transition"
          >
            Open Admin Command Centre →
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700 transition"
          >
            Sign In / Login
          </Link>
        </div>
      </div>
    </main>
  );
}
