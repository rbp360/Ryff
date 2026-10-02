import { db } from './db';
import { DealContext } from './guard';
import { getUserPreferences, getPersonalizedFeed } from './personalization';

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
    source_name?: string | null;
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
  userPreferences: {
    favoritePlayers: string[];
    followedBrands: string[];
  };
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
      select id, listing_url, title, price_amount, original_price_amount, price_currency, condition, published_at, price_drop_text
      from deals
      where want_key = any(${userWantKeys})
      order by seen_at desc
      limit 5
    `;

    deals = matchedDeals.map((d) => {
      let daysOnMarket: number | null = null;
      if (d.published_at) {
        const pubDate = new Date(d.published_at as string);
        if (!isNaN(pubDate.getTime())) {
          const diffMs = Date.now() - pubDate.getTime();
          daysOnMarket = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        }
      }

      return {
        id: Number(d.id),
        listingUrl: d.listing_url,
        title: d.title,
        priceAmount: d.price_amount ? Number(d.price_amount) : null,
        originalPriceAmount: d.original_price_amount ? Number(d.original_price_amount) : null,
        priceCurrency: d.price_currency,
        priceDropText: d.price_drop_text,
        publishedAt: d.published_at ? String(d.published_at) : null,
        daysOnMarket,
      };
    });
  }

  // 4. Retrieve matching news items from the last 14 days
  // Extract keywords or brands from user message
  const words = cleanQuery
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  let relevantItems: Array<{
    id: number;
    title: string;
    snippet: string;
    summary: string | null;
    brands: string[];
    products: string[];
    url: string;
    source_name: string | null;
  }> = [];

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

  // If no items matched by specific keyword query, grab top items from user's personalized feed
  if (relevantItems.length === 0) {
    const pFeed = await getPersonalizedFeed(userId, { limit: 6 });
    for (const pf of pFeed) {
      relevantItems.push({
        id: pf.id,
        title: pf.title,
        snippet: pf.summary,
        summary: pf.summary,
        brands: pf.brands,
        products: pf.products,
        url: pf.url,
        source_name: pf.source_name,
      });
    }
  }

  const userPreferences = await getUserPreferences(userId);

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
    userPreferences,
  };
}
