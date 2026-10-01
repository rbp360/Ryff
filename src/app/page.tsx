import Link from 'next/link';
import postgres from 'postgres';
import { env } from '@/lib/env';

export const revalidate = 0; // Dynamic server component

interface EpisodeTopic {
  title: string;
  hank: string;
  vee: string;
  disagreement: string;
  source_item_ids: number[];
}

interface SourceItem {
  id: number;
  title: string;
  url: string;
  source_name: string;
  summary: string;
  item_type: string;
  hype: number;
  brands: string[];
}

async function getLatestEpisodeData() {
  try {
    const sql = postgres(env.DATABASE_URL);
    
    // 1. Get latest published episode
    const episodes = await sql`
      SELECT id, headline, topics, transcript, published_at, status
      FROM episodes
      ORDER BY id DESC
      LIMIT 1
    `;

    // 2. Get recently digested news items
    const recentItems = await sql<SourceItem[]>`
      SELECT i.id, i.title, i.url, s.name as source_name, i.summary, i.item_type, i.hype, i.brands
      FROM items i
      JOIN sources s ON i.source_id = s.id
      WHERE i.digested_at IS NOT NULL
      ORDER BY i.published_at DESC NULLS LAST, i.id DESC
      LIMIT 12
    `;

    await sql.end();

    const latestEpisode = episodes[0] || null;
    let topics: EpisodeTopic[] = [];

    if (latestEpisode) {
      topics = typeof latestEpisode.topics === 'string' 
        ? JSON.parse(latestEpisode.topics) 
        : latestEpisode.topics;
    }

    return {
      episode: latestEpisode,
      topics,
      recentItems,
    };
  } catch (err) {
    console.error('Failed to load episode data:', err);
    return { episode: null, topics: [], recentItems: [] };
  }
}

export default async function HomePage() {
  const { episode, topics, recentItems } = await getLatestEpisodeData();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-extrabold tracking-tight text-white text-lg">RYFF</span>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
              v2.5 Episode Live
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700 font-mono"
            >
              Command Centre
            </Link>
            <Link
              href="/login"
              className="text-xs px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition shadow"
            >
              Cadre Sign In
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-8 space-y-10">
        {/* Episode Header */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
            🎙️ Episode #{episode?.id || 'Latest'} • {episode?.published_at ? new Date(episode.published_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }) : 'Today'}
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            {episode?.headline || "Hank & Vee Clash Over Today's Gear News"}
          </h1>

          <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto">
            Two fictional gear nerds read today's guitar launches, reviews, and rumours so you don't have to.
          </p>
        </section>

        {/* Hank vs Vee Debate Cards */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <span>🔥</span> The Daily Debate
          </h2>

          {topics.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
              No episode debate topics found. Run <code className="text-cyan-400 font-mono">npx tsx scripts/run-pipeline.ts</code> to generate today's episode.
            </div>
          ) : (
            topics.map((topic, idx) => (
              <div 
                key={idx} 
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 hover:border-slate-700 transition"
              >
                {/* Topic Header & Disagreement */}
                <div className="space-y-2 border-b border-slate-800/80 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
                      Topic #{idx + 1}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60 font-medium">
                      ⚡ Where they disagree: {topic.disagreement}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {topic.title}
                  </h3>
                </div>

                {/* Character Interactions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Hank Card */}
                  <div className="bg-slate-950/80 border border-amber-900/30 rounded-xl p-5 space-y-3 relative overflow-hidden">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-amber-950 border border-amber-700/50 flex items-center justify-center text-xl shadow">
                        🧔
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-amber-300">Hank</h4>
                        <p className="text-xs text-slate-400">The Grumpy Luthier • Vintage & Craft Purist</p>
                      </div>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed italic border-l-2 border-amber-600/50 pl-3">
                      "{topic.hank.replace(/^Hank:\s*/i, '')}"
                    </p>
                  </div>

                  {/* Vee Card */}
                  <div className="bg-slate-950/80 border border-cyan-900/30 rounded-xl p-5 space-y-3 relative overflow-hidden">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-cyan-950 border border-cyan-700/50 flex items-center justify-center text-xl shadow">
                        ⚡
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-cyan-300">Vee</h4>
                        <p className="text-xs text-slate-400">The Modern Modeller • Deal Hunter & Tech Fan</p>
                      </div>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed italic border-l-2 border-cyan-600/50 pl-3">
                      "{topic.vee.replace(/^Vee:\s*/i, '')}"
                    </p>
                  </div>
                </div>

                {/* Source Cites */}
                {topic.source_item_ids && topic.source_item_ids.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Cited Sources:</span>
                    <div className="flex flex-wrap gap-2">
                      {topic.source_item_ids.map((id) => (
                        <span key={id} className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px] border border-slate-700">
                          [[item:{id}]]
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </section>

        {/* Digested News Stories Feed */}
        <section className="space-y-6 pt-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>📰</span> Today's Digested Gear Feed
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Categorized & Summarized by Gemini Flash
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentItems.map((item) => (
              <div 
                key={item.id} 
                className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 hover:bg-slate-900 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                      {item.source_name}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded uppercase font-bold tracking-wider bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                      {item.item_type || 'news'}
                    </span>
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-slate-100 hover:text-cyan-400 transition line-clamp-2"
                  >
                    {item.title}
                  </a>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {item.summary || 'Summary pending digest processing.'}
                  </p>
                </div>

                {item.brands && item.brands.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/40 flex items-center gap-1.5 flex-wrap">
                    {item.brands.map((b) => (
                      <span key={b} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-amber-300/90 font-mono">
                        #{b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Disclaimer Footer */}
        <footer className="pt-8 border-t border-slate-800/80 text-center text-xs text-slate-500 space-y-2">
          <p>AI-generated fictional characters. Not professional advice.</p>
          <p className="font-mono text-[11px]">Ryff MVP • Autonomous Feed Ingestion & Character Debate System</p>
        </footer>
      </div>
    </main>
  );
}
