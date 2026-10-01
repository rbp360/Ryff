import postgres from 'postgres';
import Link from 'next/link';
import { env } from '@/lib/env';

export const revalidate = 0; // Dynamic server component

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

interface PipelineRunRow {
  id: number;
  started_at: Date;
  finished_at: Date | null;
  status: string;
  cost_usd: string | number;
  stage_stats: Record<string, unknown>;
  error: string | null;
}

interface EpisodeRow {
  id: number;
  headline: string;
  published_at: Date | null;
  status: string;
  created_at: Date;
}

async function getAdminData() {
  try {
    const sql = postgres(env.DATABASE_URL);

    // 1. Sources health
    const sources = await sql<SourceRow[]>`
      SELECT id, kind, name, url, tier, active, last_fetched_at, last_status
      FROM sources
      ORDER BY active DESC, kind ASC, name ASC
    `;

    // 2. Last 20 Pipeline Runs
    const pipelineRuns = await sql<PipelineRunRow[]>`
      SELECT id, started_at, finished_at, status, cost_usd, stage_stats, error
      FROM pipeline_runs
      ORDER BY id DESC
      LIMIT 20
    `;

    // 3. Latest Published Episodes
    const episodes = await sql<EpisodeRow[]>`
      SELECT id, headline, published_at, status, created_at
      FROM episodes
      ORDER BY id DESC
      LIMIT 10
    `;

    // 4. Calculate today's total pipeline spend
    const todaySpendResult = await sql`
      SELECT COALESCE(SUM(cost_usd), 0) as today_spend
      FROM pipeline_runs
      WHERE started_at >= CURRENT_DATE
    `;

    // 5. Total items count
    const itemsCountResult = await sql`
      SELECT 
        COUNT(*) as total_items,
        COUNT(*) FILTER (WHERE digested_at IS NOT NULL) as digested_items
      FROM items
    `;

    await sql.end();

    const todaySpend = Number(todaySpendResult[0]?.today_spend || 0);
    const totalItems = Number(itemsCountResult[0]?.total_items || 0);
    const digestedItems = Number(itemsCountResult[0]?.digested_items || 0);

    return {
      sources,
      pipelineRuns,
      episodes,
      todaySpend,
      totalItems,
      digestedItems,
    };
  } catch (err) {
    console.error('Failed to query admin command centre data:', err);
    return {
      sources: [],
      pipelineRuns: [],
      episodes: [],
      todaySpend: 0,
      totalItems: 0,
      digestedItems: 0,
    };
  }
}

export default async function AdminCommandCentrePage() {
  const { sources, pipelineRuns, episodes, todaySpend, totalItems, digestedItems } = await getAdminData();

  const totalSources = sources.length;
  const activeSources = sources.filter((s) => s.active).length;
  const okSources = sources.filter((s) => s.last_status && s.last_status.toLowerCase() === 'ok').length;
  const errorSources = sources.filter(
    (s) => s.last_status && (s.last_status.toLowerCase().includes('error') || s.last_status.includes('403') || s.last_status.includes('429'))
  ).length;

  const globalDailyCap = 8.0; // $8.00 per caps.json
  const spendPercent = Math.min(100, Math.round((todaySpend / globalDailyCap) * 100));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Ryff Command Centre</h1>
              <span className="text-xs px-2.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700 font-mono">
                Admin v2.5
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Automated Pipeline Monitor, Cost Controls, Feed Health &amp; Episode Management
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700"
            >
              ← Public Home
            </Link>
          </div>
        </div>

        {/* Global Overview & Spend Guardrails */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Today's Spend vs Global Cap */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">Today&apos;s Spend</p>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                Cap: ${globalDailyCap.toFixed(2)}
              </span>
            </div>
            <p className="text-3xl font-extrabold text-white font-mono">
              ${todaySpend.toFixed(4)}
            </p>
            <div className="space-y-1">
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${spendPercent > 80 ? 'bg-rose-500' : spendPercent > 50 ? 'bg-amber-500' : 'bg-cyan-400'}`}
                  style={{ width: `${Math.max(2, spendPercent)}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-500 font-mono block">
                {spendPercent}% of $8.00 daily limit used
              </span>
            </div>
          </div>

          {/* Database Items Stored */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">Articles Ingested</p>
            <p className="text-3xl font-extrabold text-white font-mono">{totalItems}</p>
            <span className="text-xs text-slate-500 block font-mono">
              {digestedItems} digested ({totalItems > 0 ? Math.round((digestedItems / totalItems) * 100) : 0}%)
            </span>
          </div>

          {/* Episodes Published */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">Total Episodes</p>
            <p className="text-3xl font-extrabold text-cyan-400 font-mono">{episodes.length}</p>
            <span className="text-xs text-slate-500 block font-mono">
              {episodes.filter((e) => e.status === 'published').length} live published
            </span>
          </div>

          {/* Active Feeds Status */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">Source Feeds</p>
            <p className="text-3xl font-extrabold text-emerald-400 font-mono">
              {okSources}/{activeSources}
            </p>
            <span className="text-xs text-slate-500 block font-mono">
              {errorSources > 0 ? `⚠️ ${errorSources} with errors (${totalSources} total)` : `All active healthy (${totalSources} total)`}
            </span>
          </div>
        </div>

        {/* Pipeline Execution History (Last 20 Runs) */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-0">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>⚡</span> Pipeline Execution Log (Last 20 Runs)
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Automated twice-daily scheduler + manual CLI runs with per-stage accounting
              </p>
            </div>
            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700 font-mono">
              {pipelineRuns.length} Runs Logged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-mono uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Run ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Started At</th>
                  <th className="py-3 px-4">Cost (USD)</th>
                  <th className="py-3 px-4">Stage Stats</th>
                  <th className="py-3 px-4">Error / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {pipelineRuns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No pipeline execution records found in database.
                    </td>
                  </tr>
                ) : (
                  pipelineRuns.map((run) => {
                    const costNum = Number(run.cost_usd || 0);
                    const stats = typeof run.stage_stats === 'string'
                      ? JSON.parse(run.stage_stats)
                      : run.stage_stats || {};

                    return (
                      <tr key={run.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold text-white">#{run.id}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                              run.status === 'ok'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                : run.status === 'partial'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                                : run.status === 'running'
                                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                                : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                            }`}
                          >
                            {run.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(run.started_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-cyan-300">
                          ${costNum.toFixed(5)}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-400 max-w-xs truncate">
                          {stats.ingest && `Ingest: ${stats.ingest.itemsIngested} items`}
                          {stats.digest && ` • Digest: ${stats.digest.digestedCount}`}
                          {stats.debate?.episodeId && ` • Ep: #${stats.debate.episodeId}`}
                        </td>
                        <td className="py-3 px-4 text-rose-400 text-[11px] max-w-xs truncate">
                          {run.error || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Source Feeds Health Table */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-0">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📡</span> Monitored Feed Sources ({sources.length})
            </h2>
            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700 font-mono">
              Auto-Refreshed
            </span>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-mono uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Kind</th>
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Fetched</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {sources.map((src) => {
                  const isOk = src.last_status && src.last_status.toLowerCase() === 'ok';
                  const isErr = src.last_status && (src.last_status.toLowerCase().includes('error') || src.last_status.includes('403') || src.last_status.includes('429'));

                  return (
                    <tr key={src.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-4 font-semibold text-white">
                        <a href={src.url} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition">
                          {src.name}
                        </a>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 uppercase text-[10px]">{src.kind}</td>
                      <td className="py-2.5 px-4 text-slate-400 text-[10px]">{src.tier}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isOk
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                              : isErr
                              ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {src.last_status || 'pending'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                        {src.last_fetched_at ? new Date(src.last_fetched_at).toLocaleTimeString() : 'Never'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Admin Footer */}
        <footer className="pt-4 text-center text-xs text-slate-500 space-y-2">
          <p>Ryff Command Centre • Confidential Admin Access</p>
        </footer>
      </div>
    </main>
  );
}
