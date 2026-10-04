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

interface FlaggedMessageRow {
  id: number;
  bot: string;
  role: string;
  content: string;
  cost_usd: string | number;
  created_at: Date;
}

interface FeedbackRow {
  id: number;
  kind: string;
  body: string | null;
  created_at: Date;
}

interface UserMetrics {
  totalUsers: number;
  cadreUsers: number;
  ukResidents: number;
  totalMessages: number;
  totalRigs: number;
}

interface AssistantUserCostRow {
  userId: string;
  email: string | null;
  cohort: string | null;
  totalRequests: number;
  actionCount: number;
  queryCount: number;
  helpCount: number;
  chatCount: number;
  totalCostUsd: number;
  lastActive: Date;
}

async function getAdminData() {
  try {
    const sql = postgres(env.DATABASE_URL);

    // 1. Sources health (active feeds only)
    const sources = await sql<SourceRow[]>`
      SELECT id, kind, name, url, tier, active, last_fetched_at, last_status
      FROM sources
      WHERE active = true
      ORDER BY kind ASC, name ASC
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

    // 4. Calculate today's total pipeline & chat spend
    const todaySpendResult = await sql`
      SELECT 
        (
          COALESCE((SELECT SUM(cost_usd) FROM pipeline_runs WHERE started_at >= CURRENT_DATE), 0) +
          COALESCE((SELECT SUM(cost_usd) FROM usage_daily WHERE day = CURRENT_DATE), 0)
        ) as today_spend
    `;

    // 5. Total items count
    const itemsCountResult = await sql`
      SELECT 
        COUNT(*) as total_items,
        COUNT(*) FILTER (WHERE digested_at IS NOT NULL) as digested_items
      FROM items
    `;

    // 6. Flagged Messages Queue (for 10-min daily triage)
    const flaggedMessages = await sql<FlaggedMessageRow[]>`
      SELECT id, bot, role, content, cost_usd, created_at
      FROM messages
      WHERE flagged = true
      ORDER BY id DESC
      LIMIT 20
    `;

    // 7. Feedback & Survey Submissions
    const feedbackList = await sql<FeedbackRow[]>`
      SELECT id, kind, body, created_at
      FROM feedback
      ORDER BY id DESC
      LIMIT 20
    `;

    // 8. User & Cohort Metrics
    const userStats = await sql`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE cohort = 'cadre') as cadre_users,
        (SELECT COUNT(*) FROM users WHERE uk_resident = true) as uk_residents,
        (SELECT COUNT(*) FROM messages) as total_messages,
        (SELECT COUNT(*) FROM rig_items) as total_rigs
    `;

    // 9. Assistant Commands & Cost Per User (Today)
    const assistantCostsRaw = await sql`
      SELECT 
        u.id as user_id,
        u.email,
        u.cohort,
        COUNT(a.id) as total_requests,
        COUNT(a.id) FILTER (WHERE a.intent = 'action') as action_count,
        COUNT(a.id) FILTER (WHERE a.intent = 'query') as query_count,
        COUNT(a.id) FILTER (WHERE a.intent = 'app_help') as help_count,
        COUNT(a.id) FILTER (WHERE a.intent = 'chat') as chat_count,
        COALESCE(SUM(a.cost_usd), 0) as total_cost_usd,
        MAX(a.created_at) as last_active
      FROM assistant_cost_logs a
      JOIN users u ON u.id = a.user_id
      WHERE a.created_at >= CURRENT_DATE
      GROUP BY u.id, u.email, u.cohort
      ORDER BY total_cost_usd DESC, total_requests DESC
      LIMIT 20
    `;

    const assistantCosts: AssistantUserCostRow[] = assistantCostsRaw.map((r) => ({
      userId: String(r.user_id),
      email: r.email ? String(r.email) : null,
      cohort: r.cohort ? String(r.cohort) : null,
      totalRequests: Number(r.total_requests || 0),
      actionCount: Number(r.action_count || 0),
      queryCount: Number(r.query_count || 0),
      helpCount: Number(r.help_count || 0),
      chatCount: Number(r.chat_count || 0),
      totalCostUsd: Number(r.total_cost_usd || 0),
      lastActive: new Date(r.last_active),
    }));

    await sql.end();

    const todaySpend = Number(todaySpendResult[0]?.today_spend || 0);
    const totalItems = Number(itemsCountResult[0]?.total_items || 0);
    const digestedItems = Number(itemsCountResult[0]?.digested_items || 0);

    const userMetrics: UserMetrics = {
      totalUsers: Number(userStats[0]?.total_users || 0),
      cadreUsers: Number(userStats[0]?.cadre_users || 0),
      ukResidents: Number(userStats[0]?.uk_residents || 0),
      totalMessages: Number(userStats[0]?.total_messages || 0),
      totalRigs: Number(userStats[0]?.total_rigs || 0),
    };

    return {
      sources,
      pipelineRuns,
      episodes,
      todaySpend,
      totalItems,
      digestedItems,
      flaggedMessages,
      feedbackList,
      userMetrics,
      assistantCosts,
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
      flaggedMessages: [],
      feedbackList: [],
      userMetrics: { totalUsers: 0, cadreUsers: 0, ukResidents: 0, totalMessages: 0, totalRigs: 0 },
      assistantCosts: [],
    };
  }
}

export default async function AdminCommandCentrePage() {
  const {
    sources,
    pipelineRuns,
    episodes,
    todaySpend,
    totalItems,
    digestedItems,
    flaggedMessages,
    feedbackList,
    userMetrics,
    assistantCosts,
  } = await getAdminData();

  const totalSources = sources.length;
  const activeSources = sources.filter((s) => s.active).length;
  const okSources = sources.filter((s) => s.last_status && s.last_status.toLowerCase() === 'ok').length;
  const errorSources = sources.filter(
    (s) => s.last_status && (s.last_status.toLowerCase().includes('error') || s.last_status.includes('403') || s.last_status.includes('429'))
  ).length;

  const globalDailyCap = 8.0; // $8.00 per caps.json
  const spendPercent = Math.min(100, Math.round((todaySpend / globalDailyCap) * 100));
  const isHighSpend = todaySpend >= 4.0; // >50% daily spend alert

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

        {/* High Spend Alert Banner (>50% Global Daily Cap) */}
        {isHighSpend && (
          <div className="p-4 bg-amber-950/80 border border-amber-600/80 rounded-xl flex items-center justify-between gap-4 shadow-lg animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="text-sm font-bold text-amber-200">Daily Spend Alert: &gt;50% Global Cap Reached</h3>
                <p className="text-xs text-amber-300/80">
                  Today&apos;s total spend has reached <strong>${todaySpend.toFixed(4)}</strong> ({spendPercent}% of $8.00 daily limit).
                </p>
              </div>
            </div>
            <span className="text-xs font-mono px-3 py-1 bg-amber-900 border border-amber-500 text-amber-200 rounded-lg">
              Threshold Warning
            </span>
          </div>
        )}

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

          {/* User Metrics */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">Cadre Community</p>
            <p className="text-3xl font-extrabold text-cyan-400 font-mono">{userMetrics.cadreUsers}</p>
            <span className="text-xs text-slate-500 block font-mono">
              {userMetrics.ukResidents} UK • {userMetrics.totalRigs} rigs saved
            </span>
          </div>

          {/* Database Items Stored */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">Articles Ingested</p>
            <p className="text-3xl font-extrabold text-white font-mono">{totalItems}</p>
            <span className="text-xs text-slate-500 block font-mono">
              {digestedItems} digested ({totalItems > 0 ? Math.round((digestedItems / totalItems) * 100) : 0}%)
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

        {/* Flagged Messages Triage Queue */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-0">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🚩</span> Flagged Messages Triage Queue ({flaggedMessages.length})
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Daily 10-minute review queue for user-flagged bad answers &amp; moderation
              </p>
            </div>
            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700 font-mono">
              {flaggedMessages.length} Pending
            </span>
          </div>

          <div className="overflow-x-auto max-h-64">
            {flaggedMessages.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                ✓ No flagged messages pending review.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-mono uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">Msg ID</th>
                    <th className="py-2.5 px-4">Bot</th>
                    <th className="py-2.5 px-4">Content</th>
                    <th className="py-2.5 px-4">Cost</th>
                    <th className="py-2.5 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                  {flaggedMessages.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-4 font-bold text-amber-400">#{m.id}</td>
                      <td className="py-2.5 px-4 uppercase text-white font-bold">{m.bot}</td>
                      <td className="py-2.5 px-4 max-w-md truncate text-slate-300">{m.content}</td>
                      <td className="py-2.5 px-4 text-cyan-300">${Number(m.cost_usd || 0).toFixed(5)}</td>
                      <td className="py-2.5 px-4 text-slate-400">{new Date(m.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Feedback & Survey Submissions */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-0">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📋</span> User Feedback &amp; Survey Responses ({feedbackList.length})
            </h2>
            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700 font-mono">
              Latest Submissions
            </span>
          </div>

          <div className="overflow-x-auto max-h-56">
            {feedbackList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                No user feedback recorded yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-mono uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">ID</th>
                    <th className="py-2.5 px-4">Kind</th>
                    <th className="py-2.5 px-4">Feedback / Details</th>
                    <th className="py-2.5 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                  {feedbackList.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-4 font-bold text-white">#{f.id}</td>
                      <td className="py-2.5 px-4 font-bold uppercase text-cyan-400">{f.kind}</td>
                      <td className="py-2.5 px-4 text-slate-200">{f.body || '—'}</td>
                      <td className="py-2.5 px-4 text-slate-400">{new Date(f.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

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

        {/* Latest Episodes Section */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-0">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🎙️</span> Latest Published &amp; Draft Episodes ({episodes.length})
            </h2>
            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700 font-mono">
              Debate History
            </span>
          </div>

          <div className="overflow-x-auto max-h-64">
            {episodes.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                No episodes created yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-mono uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">Episode ID</th>
                    <th className="py-2.5 px-4">Headline</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Published At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                  {episodes.map((ep) => (
                    <tr key={ep.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-4 font-bold text-white">#{ep.id}</td>
                      <td className="py-2.5 px-4 text-cyan-300">
                        <Link href={`/episodes/${ep.id}`} className="hover:underline">
                          {ep.headline}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            ep.status === 'published'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                              : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                          }`}
                        >
                          {ep.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">
                        {ep.published_at ? new Date(ep.published_at).toLocaleString() : 'Draft'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
 
        {/* Assistant Usage & Cost by User (Today) */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-0">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-amber-400">⚡</span> Assistant Commands &amp; Cost by User (Today) ({assistantCosts.length})
            </h2>
            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700 font-mono">
              Live Daily Telemetry
            </span>
          </div>

          <div className="overflow-x-auto max-h-80">
            {assistantCosts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                No assistant commands logged yet today.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-mono uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">User</th>
                    <th className="py-2.5 px-4">Cohort</th>
                    <th className="py-2.5 px-4">Total Commands</th>
                    <th className="py-2.5 px-4">Breakdown (Act / Qry / Help / Chat)</th>
                    <th className="py-2.5 px-4">Estimated Spend</th>
                    <th className="py-2.5 px-4">Last Command</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                  {assistantCosts.map((u) => (
                    <tr key={u.userId} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-4 font-semibold text-white">
                        {u.email || `${u.userId.slice(0, 8)}...`}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.cohort === 'cadre'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {u.cohort || 'public'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-cyan-300">
                        {u.totalRequests}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                        <span className="text-emerald-400 font-semibold">{u.actionCount} act</span>
                        {' · '}
                        <span className="text-cyan-400 font-semibold">{u.queryCount} qry</span>
                        {' · '}
                        <span className="text-blue-400 font-semibold">{u.helpCount} help</span>
                        {' · '}
                        <span className="text-purple-400 font-semibold">{u.chatCount} chat</span>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-emerald-400">
                        ${u.totalCostUsd.toFixed(5)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                        {new Date(u.lastActive).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
