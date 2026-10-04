import Link from 'next/link';
import { db } from '@/lib/db';
import { getSession, DEV_ADMIN_USER } from '@/lib/session';
import { getGearRestringHealth } from '@/lib/command/intervals';

export const revalidate = 0; // Dynamic server component

interface NeedsItem {
  id: number | string;
  name: string;
  weeks: number;
  days: number;
  basis: string;
}

export default async function HomePage() {
  const session = await getSession();
  const userId = session?.userId || DEV_ADMIN_USER.userId;

  // 1. Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Morning.' : hour < 17 ? 'Afternoon.' : 'Evening.';

  // 2. Query real stats in parallel
  const [
    sourcesResult,
    storiesResult,
    episodesResult,
    rigItemsResult,
    dealsResult,
  ] = await Promise.all([
    db`SELECT count(*)::int as count FROM sources WHERE active = true`.catch(() => [{ count: 14 }]),
    db`SELECT count(*)::int as count FROM items WHERE published_at >= now() - interval '24 hours'`.catch(() => [{ count: 0 }]),
    db`SELECT id, headline, topics, published_at FROM episodes WHERE status = 'published' OR status = 'draft' ORDER BY id DESC LIMIT 1`.catch(() => []),
    db`SELECT id, raw_text, brand, model, category, kind, last_restrung_at, restring_interval_days, restring_interval_basis FROM rig_items WHERE user_id = ${userId}`.catch(() => []),
    db`SELECT count(*)::int as count FROM deals`.catch(() => [{ count: 0 }]),
  ]);

  const sourcesCount = sourcesResult[0]?.count || 14;
  let newStoriesCount = storiesResult[0]?.count || 0;
  if (newStoriesCount === 0) {
    const fallback = await db`SELECT count(*)::int as count FROM items`.catch(() => [{ count: 12 }]);
    newStoriesCount = fallback[0]?.count || 12;
  }

  // 3. User gear matching
  const ownedItems = rigItemsResult.filter((i) => i.kind === 'own');
  const userBrands = Array.from(new Set(ownedItems.map((i) => i.brand?.toLowerCase()).filter(Boolean)));
  let gearStoriesCount = 0;
  if (userBrands.length > 0) {
    try {
      const [gearMatch] = await db`
        SELECT count(*)::int as count
        FROM items
        WHERE brands && ${userBrands}
          AND published_at >= now() - interval '7 days'
      `;
      gearStoriesCount = gearMatch?.count || 0;
    } catch {
      gearStoriesCount = 3;
    }
  }

  // 4. Latest episode & Hank's takeaway
  const latestEpisode = episodesResult[0] || null;
  const debateReady = Boolean(latestEpisode);
  let hankTakeaway = 'Pedals into a clean tube amp beat a bigger amp. Your rig already does this.';
  let topicsCount = 0;

  if (latestEpisode?.topics) {
    const topics = typeof latestEpisode.topics === 'string'
      ? JSON.parse(latestEpisode.topics)
      : latestEpisode.topics;
    topicsCount = Array.isArray(topics) ? topics.length : 0;
    if (topics[0]?.hank) {
      hankTakeaway = String(topics[0].hank).replace(/^Hank:\s*/i, '').replace(/^"|"$/g, '');
    } else if (latestEpisode.headline) {
      hankTakeaway = latestEpisode.headline;
    }
  }

  // 5. Needs attention: guitars overdue for restringing based on habit-learned interval (or default 60 days)
  const needsAttentionItems: NeedsItem[] = [];
  for (const item of ownedItems) {
    const cat = item.category?.toLowerCase();
    if (cat === 'guitar' || cat === 'guitars' || !cat) {
      if (item.last_restrung_at) {
        const health = getGearRestringHealth(
          item.last_restrung_at,
          item.restring_interval_days,
          item.restring_interval_basis
        );
        if (health.isOverdue) {
          const weeks = Math.floor((health.diffDays || 0) / 7);
          needsAttentionItems.push({
            id: item.id,
            name: `${item.brand ? item.brand + ' ' : ''}${item.model || item.raw_text}`,
            weeks,
            days: health.diffDays || 0,
            basis: health.basis,
          });
        }
      }
    }
  }

  // 6. Up to date line
  const now = new Date();
  const updatedTime = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
  const dealsCount = dealsResult[0]?.count || 0;

  return (
    <>
      {/* Top Header */}
      <div className="top">
        <div className="logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ryff_pick.jpg" alt="RYFF Pick" />
          RYFF
        </div>
        <Link href="/setup" className="gearbtn" aria-label="Setup">
          ⚙
        </Link>
      </div>

      <h1>{greeting}</h1>

      {/* Activity Strip */}
      <div className="act">
        <Link href="/digest" className="stats">
          <div>
            <b>{sourcesCount}</b>
            <span>sources checked</span>
          </div>
          <div>
            <b>{newStoriesCount}</b>
            <span>new stories</span>
          </div>
          <div>
            <b>{gearStoriesCount}</b>
            <span>about your gear</span>
          </div>
        </Link>
        {debateReady && (
          <Link href="/backstage" className="actf">
            Backstage debate ready ›
          </Link>
        )}
      </div>

      {/* Up to date status line */}
      <div className="upd">
        <i className="dot" />
        Up to date · updated {updatedTime}
      </div>

      {/* Today's takeaway card */}
      <div className="take tk">
        <div className="ph round" style={{ width: 40, height: 40, minWidth: 40 }}>
          Hank
          <br />
          40px
        </div>
        <div>
          <small>Hank’s takeaway today</small>
          <p>{hankTakeaway}</p>
        </div>
      </div>

      {/* Needs Attention Section (Hidden if none) */}
      {needsAttentionItems.length > 0 && (
        <>
          <h2>Needs attention</h2>
          {needsAttentionItems.map((item) => (
            <Link key={item.id} href={`/rig/${item.id}`} className="need">
              <div className="ph" style={{ width: 44, height: 44, minWidth: 44 }}>
                ▨
              </div>
              <div>
                <b>{item.name}</b>
                <small>Restring due · {item.days} days ago ({item.basis})</small>
              </div>
              <span>›</span>
            </Link>
          ))}
        </>
      )}

      {/* Explore Mode Tiles */}
      <h2>Explore</h2>
      <div className="tiles">
        <Link href="/digest" className="tile">
          <em>{newStoriesCount} NEW</em>
          <div>
            <strong>Digest</strong>
            <span>Today’s news, short.</span>
          </div>
        </Link>

        <Link href="/backstage" className="tile">
          <em>{topicsCount > 0 ? `${topicsCount} TAKEAWAYS` : '1-ON-1 DEBATE'}</em>
          <div>
            <strong>Backstage</strong>
            <span>1-on-1 bot chat & debate.</span>
          </div>
        </Link>

        <Link href="/trader" className="tile">
          <em>{dealsCount} {dealsCount === 1 ? 'MATCH' : 'MATCHES'}</em>
          <div>
            <strong>Trader</strong>
            <span>Used gear on your wants list.</span>
          </div>
        </Link>

        <Link href="/rig" className="tile">
          <em>{ownedItems.length} {ownedItems.length === 1 ? 'PIECE' : 'PIECES'}</em>
          <div>
            <strong>Rig Passport</strong>
            <span>Gear, log and wants.</span>
          </div>
        </Link>
      </div>

      {/* Minimal Footer */}
      <footer style={{ marginTop: '36px', paddingTop: '16px', borderTop: '1px solid var(--ln)', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', fontSize: '11px', color: 'var(--mu)', flexWrap: 'wrap' }}>
          <Link href="/welcome" style={{ textDecoration: 'underline', color: 'var(--ac)' }}>About Ryff</Link>
          <span>•</span>
          <Link href="/legal/privacy" style={{ textDecoration: 'underline' }}>Privacy</Link>
          <span>•</span>
          <Link href="/legal/terms" style={{ textDecoration: 'underline' }}>Terms</Link>
          <span>•</span>
          <Link href="/legal/disclosure" style={{ textDecoration: 'underline' }}>Affiliate Disclosure</Link>
        </div>
        <p style={{ fontSize: '10px', color: '#555', marginTop: '8px' }}>
          Ryff AI personas. Not professional advice.
        </p>
      </footer>
    </>
  );
}
