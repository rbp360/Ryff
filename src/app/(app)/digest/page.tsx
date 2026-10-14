import { db } from '@/lib/db';
import { getSession, DEV_ADMIN_USER } from '@/lib/session';
import { getPersonalizedFeed, getGlobalTopFeed, getUserPreferences } from '@/lib/personalization';
import { DigestFeed } from './DigestFeed';
import { BOT_ROSTER, DEFAULT_BOT_ID } from '@/lib/bots';
import { BotDossier } from '@/types/bot';

export const revalidate = 0; // Dynamic server component

export default async function DigestPage() {
  const session = await getSession();
  const userId = session?.userId || DEV_ADMIN_USER.userId;

  const [
    personalizedFeed,
    globalFeed,
    sourcesResult,
    storiesResult,
    userPreferences,
    userBotRows,
  ] = await Promise.all([
    getPersonalizedFeed(userId, { limit: 25 }),
    getGlobalTopFeed({ limit: 25 }),
    db`SELECT count(*)::int as count FROM sources WHERE active = true`.catch(() => [{ count: 14 }]),
    db`SELECT count(*)::int as count FROM items WHERE published_at >= now() - interval '24 hours'`.catch(() => [{ count: 0 }]),
    getUserPreferences(userId),
    db<{ id: string; name: string; dossier: BotDossier; is_active: boolean }[]>`
      SELECT id, name, dossier, is_active
      FROM user_bots
      WHERE user_id = ${userId} AND is_active = true
      ORDER BY updated_at DESC
      LIMIT 1
    `.catch(() => []),
  ]);

  let activeBot: BotDossier;
  if (userBotRows.length > 0 && userBotRows[0]?.dossier) {
    activeBot = userBotRows[0].dossier;
  } else if (
    userPreferences?.personality &&
    userPreferences.personality !== 'hank' &&
    BOT_ROSTER[userPreferences.personality]
  ) {
    activeBot = BOT_ROSTER[userPreferences.personality];
  } else {
    activeBot = BOT_ROSTER[DEFAULT_BOT_ID];
  }

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
      initialPreferences={userPreferences}
      initialBot={activeBot}
      sourcesCount={sourcesCount}
      newCount={newCount}
      updatedTime={updatedTime}
    />
  );
}
