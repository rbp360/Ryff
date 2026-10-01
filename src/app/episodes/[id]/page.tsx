import Link from 'next/link';
import { notFound } from 'next/navigation';
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

interface CitedItem {
  id: number;
  title: string;
  url: string;
  source_name: string;
}

interface EpisodeData {
  id: number;
  headline: string;
  topics: EpisodeTopic[];
  transcript: unknown;
  published_at: string | null;
  status: string;
}

async function getEpisodeById(id: string) {
  try {
    const episodeId = parseInt(id, 10);
    if (isNaN(episodeId)) return null;

    const sql = postgres(env.DATABASE_URL);

    // 1. Fetch episode record
    const episodes = await sql`
      SELECT id, headline, topics, transcript, published_at, status
      FROM episodes
      WHERE id = ${episodeId}
      LIMIT 1
    `;

    if (episodes.length === 0) {
      await sql.end();
      return null;
    }

    const rawEpisode = episodes[0];
    const topics: EpisodeTopic[] = typeof rawEpisode.topics === 'string'
      ? JSON.parse(rawEpisode.topics)
      : rawEpisode.topics;

    // Collect all cited item IDs
    const citedIds = Array.from(
      new Set(topics.flatMap((t) => t.source_item_ids || []))
    );

    let citedItems: CitedItem[] = [];
    if (citedIds.length > 0) {
      citedItems = await sql<CitedItem[]>`
        SELECT i.id, i.title, i.url, s.name as source_name
        FROM items i
        JOIN sources s ON i.source_id = s.id
        WHERE i.id IN ${sql(citedIds)}
      `;
    }

    // Also fetch previous/next episode links
    const adjacentEpisodes = await sql`
      (SELECT id, headline FROM episodes WHERE id < ${episodeId} ORDER BY id DESC LIMIT 1)
      UNION ALL
      (SELECT id, headline FROM episodes WHERE id > ${episodeId} ORDER BY id ASC LIMIT 1)
    `;

    await sql.end();

    return {
      episode: {
        id: rawEpisode.id,
        headline: rawEpisode.headline,
        topics,
        transcript: rawEpisode.transcript,
        published_at: rawEpisode.published_at,
        status: rawEpisode.status,
      } as EpisodeData,
      citedItemsMap: new Map(citedItems.map((item) => [item.id, item])),
      prevEpisode: adjacentEpisodes.find((ep) => ep.id < episodeId) || null,
      nextEpisode: adjacentEpisodes.find((ep) => ep.id > episodeId) || null,
    };
  } catch (err) {
    console.error(`Failed to load episode #${id}:`, err);
    return null;
  }
}

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getEpisodeById(id);

  if (!data) {
    notFound();
  }

  const { episode, citedItemsMap, prevEpisode, nextEpisode } = data;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="h-3 w-3 rounded-full bg-cyan-400 group-hover:scale-110 transition" />
            <span className="font-extrabold tracking-tight text-white text-lg">RYFF</span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              Archive • Episode #{episode.id}
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700 font-mono"
            >
              ← Latest Episode
            </Link>
            <Link
              href="/admin"
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700 font-mono"
            >
              Command Centre
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pt-8 space-y-10">
        {/* Episode Header */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
            🎙️ Episode #{episode.id} •{' '}
            {episode.published_at
              ? new Date(episode.published_at).toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : 'Published'}
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            {episode.headline}
          </h1>

          <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto">
            Autonomous debate between Hank (The Grumpy Luthier) and Vee (The Modern Modeller) on today&apos;s guitar news.
          </p>
        </section>

        {/* Topics Debate Section */}
        <section className="space-y-6">
          {episode.topics.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
              No debate topics recorded for this episode.
            </div>
          ) : (
            episode.topics.map((topic, idx) => (
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
                      ⚡ Disagreement: {topic.disagreement}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {topic.title}
                  </h2>
                </div>

                {/* Character Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Hank Card */}
                  <div className="bg-slate-950/80 border border-amber-900/30 rounded-xl p-5 space-y-3 relative overflow-hidden">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-amber-950 border border-amber-700/50 flex items-center justify-center text-xl shadow">
                        🧔
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-amber-300">Hank</h3>
                        <p className="text-xs text-slate-400">The Grumpy Luthier • Vintage & Craft Purist</p>
                      </div>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed italic border-l-2 border-amber-600/50 pl-3">
                      &ldquo;{topic.hank.replace(/^Hank:\s*/i, '')}&rdquo;
                    </p>
                  </div>

                  {/* Vee Card */}
                  <div className="bg-slate-950/80 border border-cyan-900/30 rounded-xl p-5 space-y-3 relative overflow-hidden">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-cyan-950 border border-cyan-700/50 flex items-center justify-center text-xl shadow">
                        ⚡
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-cyan-300">Vee</h3>
                        <p className="text-xs text-slate-400">The Modern Modeller • Deal Hunter & Tech Fan</p>
                      </div>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed italic border-l-2 border-cyan-600/50 pl-3">
                      &ldquo;{topic.vee.replace(/^Vee:\s*/i, '')}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Cited Sources with real outbound links (rel="noopener nofollow") */}
                {topic.source_item_ids && topic.source_item_ids.length > 0 && (
                  <div className="pt-3 border-t border-slate-800/60 space-y-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                      Cited Sources:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {topic.source_item_ids.map((id) => {
                        const item = citedItemsMap.get(id);
                        if (!item) {
                          return (
                            <span
                              key={id}
                              className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-500 font-mono"
                            >
                              [Item #{id}]
                            </span>
                          );
                        }
                        return (
                          <a
                            key={id}
                            href={item.url}
                            target="_blank"
                            rel="noopener nofollow"
                            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-slate-700 transition"
                          >
                            <span>🔗</span>
                            <span className="font-medium truncate max-w-xs">{item.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({item.source_name})</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </section>

        {/* Previous / Next Episode Navigation */}
        <div className="flex items-center justify-between border-t border-b border-slate-800/80 py-4">
          {prevEpisode ? (
            <Link
              href={`/episodes/${prevEpisode.id}`}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition"
            >
              ← Episode #{prevEpisode.id}: {prevEpisode.headline.slice(0, 30)}...
            </Link>
          ) : (
            <span className="text-xs text-slate-600 font-mono">← Oldest Episode</span>
          )}

          <Link
            href="/"
            className="text-xs px-3 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-mono"
          >
            All Episodes
          </Link>

          {nextEpisode ? (
            <Link
              href={`/episodes/${nextEpisode.id}`}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition"
            >
              Episode #{nextEpisode.id}: {nextEpisode.headline.slice(0, 30)}... →
            </Link>
          ) : (
            <span className="text-xs text-slate-600 font-mono">Latest Episode →</span>
          )}
        </div>

        {/* Footer Disclaimer */}
        <footer className="pt-4 text-center text-xs text-slate-500 space-y-2">
          <p>AI-generated fictional characters. Not professional advice.</p>
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <Link href="/legal/privacy" className="hover:text-slate-300 underline">Privacy Policy</Link>
            <span>•</span>
            <Link href="/legal/terms" className="hover:text-slate-300 underline">Terms of Service</Link>
            <span>•</span>
            <Link href="/legal/disclosure" className="hover:text-slate-300 underline">Affiliate Disclosure</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
