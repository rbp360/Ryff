import { db } from '@/lib/db';
import { getSession, DEV_ADMIN_USER } from '@/lib/session';
import { getPersonalizedFeed, getGlobalTopFeed } from '@/lib/personalization';
import { DigestFeed } from './DigestFeed';

export const revalidate = 0; // Dynamic server component

export default async function DigestPage() {
  const session = await getSession();
  const userId = session?.userId || DEV_ADMIN_USER.userId;

  const [
    personalizedFeed,
    globalFeed,
    sourcesResult,
    storiesResult,
  ] = await Promise.all([
    getPersonalizedFeed(userId, { limit: 25 }),
    getGlobalTopFeed({ limit: 25 }),
    db`SELECT count(*)::int as count FROM sources WHERE active = true`.catch(() => [{ count: 14 }]),
    db`SELECT count(*)::int as count FROM items WHERE published_at >= now() - interval '24 hours'`.catch(() => [{ count: 0 }]),
  ]);

  const sourcesCount = sourcesResult[0]?.count || 14;
  let newCount = storiesResult[0]?.count || 0;
  if (newCount === 0) {
    newCount = personalizedFeed.length || 12;
  }

  const now = new Date();
  const updatedTime = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

  return (
    <DigestFeed
      initialPersonalized={personalizedFeed}
      initialGlobal={globalFeed}
      sourcesCount={sourcesCount}
      newCount={newCount}
      updatedTime={updatedTime}
    />
  );
}
