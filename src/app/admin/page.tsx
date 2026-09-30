import postgres from 'postgres';
import Link from 'next/link';
import { env } from '@/lib/env';

export const revalidate = 0; // Dynamic server page

interface SourceRow {
  id: number;
  kind: string;
  name: string;
  url: string;
  tier: string;
  active: boolean;
  last_fetched_at: Date | null;
  last_status: string | null;
}

async function getSources(): Promise<SourceRow[]> {
  try {
    const sql = postgres(env.DATABASE_URL);
    const rows = await sql<SourceRow[]>`
      select id, kind, name, url, tier, active, last_fetched_at, last_status
      from sources
      order by active desc, kind asc, name asc
    `;
    await sql.end();
    return rows;
  } catch (err) {
    console.error('Failed to query sources for admin command centre:', err);
    return [];
  }
}

export default async function AdminCommandCentrePage() {
  const sources = await getSources();

  const total = sources.length;
  const activeCount = sources.filter(s => s.active).length;
  const okCount = sources.filter(s => s.last_status && s.last_status.includes('OK')).length;
  const errorCount = sources.filter(s => s.last_status && (s.last_status.includes('HTTP 4') || s.last_status.includes('HTTP 5') || s.last_status.includes('ERROR'))).length;
  const pendingCount = total - (okCount + errorCount);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-3xl font-bold tracking-tight text-white">Ryff Command Centre</h1>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Live Feed Ingestion, RAG Health Monitor & Source Intelligence Dashboard
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700"
            >
              ← Public Home
            </Link>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Tracked Feeds</p>
            <p className="text-3xl font-bold text-white mt-2">{total}</p>
            <span className="text-xs text-slate-500 mt-1 block">{activeCount} active in scheduler</span>
          </div>

          <div className="bg-slate-900/80 border border-emerald-900/40 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">🟢 Healthy (OK)</p>
            <p className="text-3xl font-bold text-emerald-400 mt-2">{okCount}</p>
            <span className="text-xs text-emerald-500/80 mt-1 block">Live & ingesting data</span>
          </div>

          <div className="bg-slate-900/80 border border-amber-900/40 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">🟡 Pending / Warning</p>
            <p className="text-3xl font-bold text-amber-400 mt-2">{pendingCount}</p>
            <span className="text-xs text-amber-500/80 mt-1 block">Unchecked or partial XML</span>
          </div>

          <div className="bg-slate-900/80 border border-rose-900/40 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-400">🔴 Error / Offline</p>
            <p className="text-3xl font-bold text-rose-400 mt-2">{errorCount}</p>
            <span className="text-xs text-rose-500/80 mt-1 block">Requires review or alt URL</span>
          </div>
        </div>

        {/* Sources Health Table */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Source Material & Feed RAG Status</h2>
            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
              Updated Live
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">RAG</th>
                  <th className="py-3.5 px-4">Source Name</th>
                  <th className="py-3.5 px-4">Kind</th>
                  <th className="py-3.5 px-4">Tier</th>
                  <th className="py-3.5 px-4">Last Fetched</th>
                  <th className="py-3.5 px-4">Status & Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {sources.map((src) => {
                  const status = src.last_status || 'Pending';
                  const isOk = status.includes('OK');
                  const isError = status.includes('HTTP 4') || status.includes('HTTP 5') || status.includes('ERROR');
                  
                  return (
                    <tr key={src.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        {isOk && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
                            🟢 OK
                          </span>
                        )}
                        {isError && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-950 text-rose-400 border border-rose-800">
                            🔴 FAIL
                          </span>
                        )}
                        {!isOk && !isError && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-950 text-amber-400 border border-amber-800">
                            🟡 WARN
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-sans font-semibold text-slate-100">
                        <a 
                          href={src.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="hover:underline hover:text-cyan-400 transition"
                        >
                          {src.name}
                        </a>
                      </td>

                      <td className="py-3 px-4 uppercase text-slate-400">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {src.kind}
                        </span>
                      </td>

                      <td className="py-3 px-4 capitalize text-slate-400">
                        {src.tier}
                      </td>

                      <td className="py-3 px-4 text-slate-400">
                        {src.last_fetched_at ? new Date(src.last_fetched_at).toLocaleString() : 'Never'}
                      </td>

                      <td className="py-3 px-4">
                        <span className={isOk ? 'text-emerald-400' : isError ? 'text-rose-400' : 'text-amber-400'}>
                          {src.last_status || 'Pending initial run'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}
