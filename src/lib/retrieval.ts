import { db } from './db';
import { ItemContext, DealContext } from './guard';

export interface RetrievedContext {
  episode: {
    id: number;
    headline: string;
    topics: Array<{
      title: string;
      hank: string;
      vee: string;
      disagreement: string;
      source_item_ids: number[];
    }>;
  } | null;
  items: Array<{
    id: number;
    title: string;
    snippet: string;
    summary: string | null;
    brands: string[];
    products: string[];
    url: string;
    source_name?: string;
  }>;
  rigItems: Array<{
    id: number;
    brand: string | null;
    model: string | null;
    category: string;
    kind: 'own' | 'want';
    budget_gbp: number | null;
    want_key: string | null;
  }>;
  deals: DealContext[];
}

/**
 * Builds relevant context for a user chat message:
 * 1. Latest published episode topics
 * 2. Recent news items (via brand matching & full-text search)
 * 3. The user's logged rig and wants
 * 4. Pre-matched deals on Reverb for their wants
 */
export async function retrieveChatContext(userId: string, userMessage: string): Promise<RetrievedContext> {
  const cleanQuery = userMessage.trim();

  // 1. Fetch latest published or draft episode
  const [latestEpisode] = await db`
    select id, headline, topics, published_at, status
    from episodes
    where status in ('published', 'draft')
    order by id desc
    limit 1
  `;

  let episodeTopics: Array<{
    title: string;
    hank: string;
    vee: string;
    disagreement: string;
    source_item_ids: number[];
  }> = [];

  if (latestEpisode?.topics) {
    if (Array.isArray(latestEpisode.topics)) {
      episodeTopics = latestEpisode.topics;
    } else if (typeof latestEpisode.topics === 'string') {
      try {
        episodeTopics = JSON.parse(latestEpisode.topics);
      } catch {}
    }
  }

  // 2. Fetch user rig items (up to 15)
  const rigItems = await db`
    select id, brand, model, category, kind, budget_gbp, want_key
    from rig_items
    where user_id = ${userId}
    order by kind asc, created_at asc
    limit 15
  `;

  // 3. Fetch matched deals for user's wants
  const userWantKeys = rigItems
    .filter((r) => r.kind === 'want' && r.want_key)
    .map((r) => r.want_key as string);

  let deals: DealContext[] = [];
  if (userWantKeys.length > 0) {
    const matchedDeals = await db`
      select id, listing_url, title, price_amount, price_currency, condition
      from deals
      where want_key = any(${userWantKeys})
      order by seen_at desc
      limit 5
    `;

    deals = matchedDeals.map((d) => ({
      id: Number(d.id),
      listingUrl: d.listing_url,
      title: d.title,
      priceAmount: d.price_amount ? Number(d.price_amount) : null,
      priceCurrency: d.price_currency,
    }));
  }

  // 4. Retrieve matching news items from the last 14 days
  // Extract keywords or brands from user message
  const words = cleanQuery
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  let relevantItems: any[] = [];

  if (words.length > 0) {
    // Attempt full-text search and brand matching
    const searchTerms = words.join(' | ');
    relevantItems = await db`
      select distinct i.id, i.title, i.snippet, i.summary, i.brands, i.products, i.url, s.name as source_name
      from items i
      left join sources s on s.id = i.source_id
      where (
        i.published_at >= now() - interval '14 days'
        or i.fetched_at >= now() - interval '14 days'
      )
      and (
        to_tsvector('english', coalesce(i.title,'') || ' ' || coalesce(i.summary,'') || ' ' || coalesce(i.snippet,'')) @@ to_tsquery('english', ${searchTerms})
        or i.brands && ${words}
      )
      order by i.id desc
      limit 8
    `;
  }

  // If no items matched by query, grab the 6 most recent digested items as baseline
  if (relevantItems.length === 0) {
    relevantItems = await db`
      select distinct i.id, i.title, i.snippet, i.summary, i.brands, i.products, i.url, s.name as source_name
      from items i
      left join sources s on s.id = i.source_id
      where (
        i.published_at >= now() - interval '14 days'
        or i.fetched_at >= now() - interval '14 days'
      )
      and i.summary is not null
      order by i.id desc
      limit 6
    `;
  }

  const items = relevantItems.map((item) => ({
    id: Number(item.id),
    title: item.title,
    snippet: item.snippet || '',
    summary: item.summary || null,
    brands: item.brands || [],
    products: item.products || [],
    url: item.url,
    source_name: item.source_name,
  }));

  return {
    episode: latestEpisode
      ? {
          id: Number(latestEpisode.id),
          headline: latestEpisode.headline,
          topics: episodeTopics,
        }
      : null,
    items,
    rigItems: rigItems.map((r) => ({
      id: Number(r.id),
      brand: r.brand,
      model: r.model,
      category: r.category,
      kind: r.kind as 'own' | 'want',
      budget_gbp: r.budget_gbp ? Number(r.budget_gbp) : null,
      want_key: r.want_key,
    })),
    deals,
  };
}
