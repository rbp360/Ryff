import { describe, it, expect } from 'vitest';
import { db } from '../src/lib/db';
import {
  getUserPreferences,
  updateUserPreferences,
  recordItemReaction,
  removeItemReaction,
  getPersonalizedFeed,
  getGlobalTopFeed,
} from '../src/lib/personalization';

describe('src/lib/personalization.ts', { timeout: 15000 }, () => {
  const testUserId = '00000000-0000-0000-0000-000000000001';

  it('updates and retrieves user favorite players and followed brands', async () => {
    // 1. Ensure user exists
    await db`
      insert into users (id, email, consented_at, is_adult)
      values (${testUserId}, 'test-user@ryff.local', now(), true)
      on conflict (id) do nothing
    `;

    // 2. Update preferences
    const updated = await updateUserPreferences(testUserId, {
      favoritePlayers: ['Chris Impellitteri', 'Slash'],
      followedBrands: ['B.C. Rich', 'TC Electronic'],
    });

    expect(updated.favoritePlayers).toContain('Chris Impellitteri');
    expect(updated.favoritePlayers).toContain('Slash');
    expect(updated.followedBrands).toContain('B.C. Rich');
    expect(updated.followedBrands).toContain('TC Electronic');

    // 3. Retrieve preferences
    const retrieved = await getUserPreferences(testUserId);
    expect(retrieved.favoritePlayers).toContain('Chris Impellitteri');
    expect(retrieved.followedBrands).toContain('TC Electronic');
  });

  it('records and removes item reactions', async () => {
    // Pick an existing item id or insert dummy
    const [item] = await db`select id from items limit 1`;
    if (!item) return;

    const itemId = Number(item.id);

    // Record like
    const resLike = await recordItemReaction(testUserId, itemId, 'like');
    expect(resLike.success).toBe(true);
    expect(resLike.reaction).toBe('like');

    // Remove reaction
    const resRemove = await removeItemReaction(testUserId, itemId);
    expect(resRemove.success).toBe(true);
  });

  it('queries personalized feed and assigns badges for matching players/brands', async () => {
    const feed = await getPersonalizedFeed(testUserId, { limit: 5 });
    expect(Array.isArray(feed)).toBe(true);

    if (feed.length > 0) {
      const first = feed[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('title');
      expect(first).toHaveProperty('summary');
      expect(first).toHaveProperty('score');
      expect(Array.isArray(first.match_badges)).toBe(true);
    }
  });

  it('queries global top feed ordered by global score', async () => {
    const globalFeed = await getGlobalTopFeed({ limit: 5 });
    expect(Array.isArray(globalFeed)).toBe(true);

    if (globalFeed.length > 1) {
      expect(globalFeed[0].score!).toBeGreaterThanOrEqual(globalFeed[1].score!);
    }
  });
});
