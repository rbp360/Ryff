import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory mock database state
interface MockUser {
  id: string;
  email: string;
  favorite_players: string[];
  followed_brands: string[];
  reverb_region: string;
}

interface MockReaction {
  user_id: string;
  item_id: number;
  reaction: string;
}

const mockUsers = new Map<string, MockUser>();
const mockReactions = new Map<string, MockReaction>();

const sampleItems = [
  {
    id: 1,
    title: 'Slash and Chris Impellitteri team up for new signature gear',
    headline: 'Slash & Impellitteri collab',
    url: 'https://example.com/slash-gear',
    image_url: 'https://example.com/slash.jpg',
    source_id: 1,
    source_name: 'Guitar World',
    summary: 'Slash and Chris Impellitteri unveil new models with B.C. Rich and TC Electronic.',
    key_takeaways: ['Signature guitar', '100W Tube Amp'],
    category: 'gear',
    item_type: 'news',
    brands: ['B.C. Rich', 'TC Electronic'],
    players: ['Slash', 'Chris Impellitteri'],
    products: ['Signature Model'],
    buzz_count: 3,
    hype: 4,
    controversy: 3,
    published_at: new Date().toISOString(),
    affinity_score: 28.5,
    global_score: 18.0,
  },
  {
    id: 2,
    title: 'TC Electronic announces new analog delay',
    headline: 'TC Electronic Release',
    url: 'https://example.com/tc-pedal',
    image_url: null,
    source_id: 2,
    source_name: 'Premier Guitar',
    summary: 'TC Electronic expands vintage analog series.',
    key_takeaways: ['BBD Chip', 'Stereo'],
    category: 'gear',
    item_type: 'news',
    brands: ['TC Electronic'],
    players: [],
    products: ['Delay Pedal'],
    buzz_count: 1,
    hype: 2,
    controversy: 0,
    published_at: new Date(Date.now() - 86400000).toISOString(),
    affinity_score: 14.0,
    global_score: 8.5,
  },
];

vi.mock('../src/lib/db', () => {
  const mockDb = async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const rawSql = strings.join('?').toLowerCase();

    // 1. users table queries
    if (rawSql.includes('insert into users')) {
      const id = String(values[0]);
      const email = String(values[1]);
      if (!mockUsers.has(id)) {
        mockUsers.set(id, {
          id,
          email,
          favorite_players: [],
          followed_brands: [],
          reverb_region: 'SHIPS_TO_UK',
        });
      }
      return [];
    }

    if (rawSql.includes('from users') && rawSql.includes('where id =')) {
      const id = String(values[0]);
      const user = mockUsers.get(id);
      return user ? [user] : [];
    }

    if (rawSql.includes('update users')) {
      const players = values[0] as string[];
      const brands = values[1] as string[];
      const region = values[2] as string;
      const id = String(values[3]);
      const existing = mockUsers.get(id) || { id, email: 'test@ryff.local', favorite_players: [], followed_brands: [], reverb_region: 'SHIPS_TO_UK' };
      existing.favorite_players = players;
      existing.followed_brands = brands;
      existing.reverb_region = region;
      mockUsers.set(id, existing);
      return [];
    }

    // 2. item_reactions table queries
    if (rawSql.includes('insert into item_reactions')) {
      const userId = String(values[0]);
      const itemId = Number(values[1]);
      const reaction = String(values[2]);
      mockReactions.set(`${userId}:${itemId}`, { user_id: userId, item_id: itemId, reaction });
      return [];
    }

    if (rawSql.includes('delete from item_reactions')) {
      const userId = String(values[0]);
      const itemId = Number(values[1]);
      mockReactions.delete(`${userId}:${itemId}`);
      return [];
    }

    if (rawSql.includes('from item_reactions')) {
      const userId = String(values[0]);
      const reactions = Array.from(mockReactions.values()).filter(r => r.user_id === userId);
      return reactions;
    }

    // 3. rig_items table queries
    if (rawSql.includes('from rig_items')) {
      return [
        { brand: 'TC Electronic', kind: 'own' },
        { brand: 'B.C. Rich', kind: 'want' },
      ];
    }

    // 4. items table queries
    if (rawSql.includes('from items')) {
      if (rawSql.includes('order by global_score')) {
        return [...sampleItems].sort((a, b) => b.global_score - a.global_score);
      }
      return [...sampleItems].sort((a, b) => b.affinity_score - a.affinity_score);
    }

    return [];
  };

  return { db: mockDb };
});

import {
  getUserPreferences,
  updateUserPreferences,
  recordItemReaction,
  removeItemReaction,
  getPersonalizedFeed,
  getGlobalTopFeed,
} from '../src/lib/personalization';

describe('src/lib/personalization.ts', () => {
  const testUserId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    mockUsers.clear();
    mockReactions.clear();
  });

  it('updates and retrieves user favorite players and followed brands', async () => {
    // 1. Update preferences
    const updated = await updateUserPreferences(testUserId, {
      favoritePlayers: ['Chris Impellitteri', 'Slash'],
      followedBrands: ['B.C. Rich', 'TC Electronic'],
    });

    expect(updated.favoritePlayers).toContain('Chris Impellitteri');
    expect(updated.favoritePlayers).toContain('Slash');
    expect(updated.followedBrands).toContain('B.C. Rich');
    expect(updated.followedBrands).toContain('TC Electronic');

    // 2. Retrieve preferences
    const retrieved = await getUserPreferences(testUserId);
    expect(retrieved.favoritePlayers).toContain('Chris Impellitteri');
    expect(retrieved.followedBrands).toContain('TC Electronic');
  });

  it('records and removes item reactions', async () => {
    const itemId = 1;

    // Record like
    const resLike = await recordItemReaction(testUserId, itemId, 'like');
    expect(resLike.success).toBe(true);
    expect(resLike.reaction).toBe('like');

    // Remove reaction
    const resRemove = await removeItemReaction(testUserId, itemId);
    expect(resRemove.success).toBe(true);
  });

  it('queries personalized feed and assigns badges for matching players/brands', async () => {
    await updateUserPreferences(testUserId, {
      favoritePlayers: ['Slash'],
      followedBrands: ['TC Electronic'],
    });

    const feed = await getPersonalizedFeed(testUserId, { limit: 5 });
    expect(Array.isArray(feed)).toBe(true);
    expect(feed.length).toBeGreaterThan(0);

    const first = feed[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('title');
    expect(first).toHaveProperty('summary');
    expect(first).toHaveProperty('score');
    expect(Array.isArray(first.match_badges)).toBe(true);
    expect(first.match_badges).toContain('Slash');
    expect(first.match_badges).toContain('Wanted: B.C. Rich');
  });

  it('queries global top feed ordered by global score', async () => {
    const globalFeed = await getGlobalTopFeed({ limit: 5 });
    expect(Array.isArray(globalFeed)).toBe(true);
    expect(globalFeed.length).toBeGreaterThan(1);

    expect(globalFeed[0].score!).toBeGreaterThanOrEqual(globalFeed[1].score!);
  });
});
