import { db } from './db';

export interface UserPreferences {
  favoritePlayers: string[];
  followedBrands: string[];
}

export interface FeedItemCard {
  id: number;
  title: string;
  url: string;
  source_id: number;
  source_name: string;
  summary: string;
  category: string;
  item_type: string;
  brands: string[];
  players: string[];
  products: string[];
  buzz_count: number;
  hype: number;
  controversy: number;
  published_at: string | null;
  score?: number;
  match_badges: string[];
  user_reaction?: 'like' | 'dislike' | null;
}

/**
 * Retrieves a user's followed brands and favorite players
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const rows = await db`
    select favorite_players, followed_brands
    from users
    where id = ${userId}
    limit 1
  `;

  if (rows.length === 0) {
    return { favoritePlayers: [], followedBrands: [] };
  }

  return {
    favoritePlayers: rows[0].favorite_players || [],
    followedBrands: rows[0].followed_brands || [],
  };
}

/**
 * Updates a user's followed brands and favorite players
 */
export async function updateUserPreferences(
  userId: string,
  prefs: { favoritePlayers?: string[]; followedBrands?: string[] }
): Promise<UserPreferences> {
  const current = await getUserPreferences(userId);

  const newPlayers = prefs.favoritePlayers !== undefined 
    ? Array.from(new Set(prefs.favoritePlayers.map(p => p.trim()).filter(Boolean)))
    : current.favoritePlayers;

  const newBrands = prefs.followedBrands !== undefined
    ? Array.from(new Set(prefs.followedBrands.map(b => b.trim()).filter(Boolean)))
    : current.followedBrands;

  await db`
    update users
    set 
      favorite_players = ${newPlayers},
      followed_brands = ${newBrands}
    where id = ${userId}
  `;

  return {
    favoritePlayers: newPlayers,
    followedBrands: newBrands,
  };
}

/**
 * Records or updates a user's thumbs up/down reaction to an item
 */
export async function recordItemReaction(
  userId: string,
  itemId: number,
  reaction: 'like' | 'dislike'
): Promise<{ success: boolean; reaction: string }> {
  await db`
    insert into item_reactions (user_id, item_id, reaction, created_at)
    values (${userId}, ${itemId}, ${reaction}, now())
    on conflict (user_id, item_id) do update set
      reaction = excluded.reaction,
      created_at = now()
  `;

  return { success: true, reaction };
}

/**
 * Removes a user's thumbs up/down reaction
 */
export async function removeItemReaction(
  userId: string,
  itemId: number
): Promise<{ success: boolean }> {
  await db`
    delete from item_reactions
    where user_id = ${userId} and item_id = ${itemId}
  `;

  return { success: true };
}

export interface FeedQueryOptions {
  limit?: number;
  offset?: number;
  category?: string;
}

/**
 * Computes the personalized Top Feed for a user using pure SQL scoring.
 * Formula:
 * Score = (Cluster Buzz * 1.5)
 *       + Player Match (+6)
 *       + Wanted Gear Brand Match (+5)
 *       + Followed Brand Match (+4)
 *       + Owned Gear Brand Match (+2)
 *       + Thumbs Up (+3)
 *       - Thumbs Down Soft Dampener (-1.5)
 *       + Freshness Decay Bonus (up to +5 for recent items)
 */
export async function getPersonalizedFeed(
  userId: string,
  options: FeedQueryOptions = {}
): Promise<FeedItemCard[]> {
  const limit = options.limit || 10;
  const offset = options.offset || 0;
  const categoryFilter = options.category && options.category !== 'all' ? options.category : null;

  // 1. Fetch user preferences
  const userPrefs = await getUserPreferences(userId);

  // 2. Fetch user rig brands (owned & wanted)
  const rigRows = await db`
    select brand, kind from rig_items
    where user_id = ${userId} and brand is not null
  `;
  const ownedBrands = Array.from(new Set(rigRows.filter(r => r.kind === 'own').map(r => r.brand!)));
  const wantedBrands = Array.from(new Set(rigRows.filter(r => r.kind === 'want').map(r => r.brand!)));

  // 3. Fetch user reactions
  const reactionRows = await db`
    select item_id, reaction from item_reactions where user_id = ${userId}
  `;
  const reactionsMap = new Map<number, 'like' | 'dislike'>();
  for (const r of reactionRows) {
    reactionsMap.set(Number(r.item_id), r.reaction as 'like' | 'dislike');
  }

  // 4. Query digested items and compute relevance score in SQL
  const items = await db`
    select 
      i.id,
      i.title,
      i.url,
      i.source_id,
      s.name as source_name,
      i.summary,
      i.category,
      i.item_type,
      i.brands,
      i.players,
      i.products,
      i.buzz_count,
      i.hype,
      i.controversy,
      i.published_at,
      -- SQL Affinity Score Calculation
      (
        (coalesce(i.buzz_count, 1) * 1.5) +
        (coalesce(i.hype, 2) * 1.0) +
        -- Player match (+6)
        (case when i.players && ${userPrefs.favoritePlayers}::text[] then 6.0 else 0.0 end) +
        -- Wanted brand match (+5)
        (case when i.brands && ${wantedBrands}::text[] then 5.0 else 0.0 end) +
        -- Followed brand match (+4)
        (case when i.brands && ${userPrefs.followedBrands}::text[] then 4.0 else 0.0 end) +
        -- Owned brand match (+2)
        (case when i.brands && ${ownedBrands}::text[] then 2.0 else 0.0 end) +
        -- Freshness decay score (max +4 for items published today, decaying over 14 days)
        greatest(0.0, 4.0 - extract(epoch from (now() - coalesce(i.published_at, i.fetched_at))) / 86400 * 0.3)
      ) as affinity_score
    from items i
    left join sources s on s.id = i.source_id
    where i.digested_at is not null
      and (${categoryFilter}::text is null or i.category = ${categoryFilter})
    order by affinity_score desc, i.published_at desc nulls last
    limit ${limit} offset ${offset}
  `;

  // 5. Post-process to assemble badges and user reactions
  return items.map((row) => {
    const id = Number(row.id);
    const badges: string[] = [];
    const itemBrands = row.brands || [];
    const itemPlayers = row.players || [];
    const userReaction = reactionsMap.get(id) || null;

    // Check matches for badges
    const matchedPlayer = itemPlayers.find((p: string) => userPrefs.favoritePlayers.includes(p));
    if (matchedPlayer) {
      badges.push(`🎸 ${matchedPlayer}`);
    }

    const matchedWanted = itemBrands.find((b: string) => wantedBrands.includes(b));
    if (matchedWanted) {
      badges.push(`🎯 Wanted: ${matchedWanted}`);
    }

    const matchedFollowed = itemBrands.find((b: string) => userPrefs.followedBrands.includes(b));
    if (matchedFollowed && !matchedWanted) {
      badges.push(`🏷️ Followed: ${matchedFollowed}`);
    }

    const matchedOwned = itemBrands.find((b: string) => ownedBrands.includes(b));
    if (matchedOwned && !matchedWanted && !matchedFollowed) {
      badges.push(`🔌 In Your Rig: ${matchedOwned}`);
    }

    if (row.buzz_count && row.buzz_count >= 2) {
      badges.push(`🔥 ${row.buzz_count} Outlets`);
    }

    if (row.controversy && row.controversy >= 3) {
      badges.push(`⚡ High Debate`);
    }

    return {
      id,
      title: row.title,
      url: row.url,
      source_id: row.source_id,
      source_name: row.source_name || 'News',
      summary: row.summary || row.title,
      category: row.category || 'other',
      item_type: row.item_type || 'news',
      brands: itemBrands,
      players: itemPlayers,
      products: row.products || [],
      buzz_count: Number(row.buzz_count) || 1,
      hype: Number(row.hype) || 2,
      controversy: Number(row.controversy) || 0,
      published_at: row.published_at ? new Date(row.published_at).toISOString() : null,
      score: Number(row.affinity_score) || 0,
      match_badges: badges,
      user_reaction: userReaction,
    };
  });
}

/**
 * Computes the Global Top Buzz Feed (Industry News)
 */
export async function getGlobalTopFeed(
  options: FeedQueryOptions = {}
): Promise<FeedItemCard[]> {
  const limit = options.limit || 10;
  const offset = options.offset || 0;
  const categoryFilter = options.category && options.category !== 'all' ? options.category : null;

  const items = await db`
    select 
      i.id,
      i.title,
      i.url,
      i.source_id,
      s.name as source_name,
      i.summary,
      i.category,
      i.item_type,
      i.brands,
      i.players,
      i.products,
      i.buzz_count,
      i.hype,
      i.controversy,
      i.published_at,
      (
        (coalesce(i.buzz_count, 1) * 2.0) +
        (coalesce(i.hype, 2) * 1.5) +
        greatest(0.0, 5.0 - extract(epoch from (now() - coalesce(i.published_at, i.fetched_at))) / 86400 * 0.4)
      ) as global_score
    from items i
    left join sources s on s.id = i.source_id
    where i.digested_at is not null
      and (${categoryFilter}::text is null or i.category = ${categoryFilter})
    order by global_score desc, i.published_at desc nulls last
    limit ${limit} offset ${offset}
  `;

  return items.map((row) => {
    const badges: string[] = [];
    if (row.buzz_count && row.buzz_count >= 2) {
      badges.push(`🔥 ${row.buzz_count} Outlets`);
    }
    if (row.controversy && row.controversy >= 3) {
      badges.push(`⚡ High Debate`);
    }
    if (row.players && row.players.length > 0) {
      badges.push(`🎸 ${row.players[0]}`);
    }

    return {
      id: Number(row.id),
      title: row.title,
      url: row.url,
      source_id: row.source_id,
      source_name: row.source_name || 'News',
      summary: row.summary || row.title,
      category: row.category || 'other',
      item_type: row.item_type || 'news',
      brands: row.brands || [],
      players: row.players || [],
      products: row.products || [],
      buzz_count: Number(row.buzz_count) || 1,
      hype: Number(row.hype) || 2,
      controversy: Number(row.controversy) || 0,
      published_at: row.published_at ? new Date(row.published_at).toISOString() : null,
      score: Number(row.global_score) || 0,
      match_badges: badges,
    };
  });
}
