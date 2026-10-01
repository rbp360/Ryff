import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { isAllowedDest, affiliateWrap } from '../../../lib/affiliate';
import { getSession } from '../../../lib/session';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const destUrl = searchParams.get('u');
  const bot = searchParams.get('b') || null;
  const episodeIdStr = searchParams.get('e');
  const episodeId = episodeIdStr ? parseInt(episodeIdStr, 10) || null : null;
  const itemId = searchParams.get('id');

  if (!destUrl) {
    return NextResponse.json({ error: 'Missing destination URL' }, { status: 400 });
  }

  let allowed = isAllowedDest(destUrl);

  // If not on static allowlist, check if the URL matches an item or deal in our database
  if (!allowed) {
    try {
      if (itemId) {
        const [item] = await db`
          select id from items where id = ${itemId} and url = ${destUrl}
        `;
        if (item) allowed = true;
      }

      if (!allowed) {
        const [matchedItem] = await db`
          select id from items where url = ${destUrl} limit 1
        `;
        if (matchedItem) allowed = true;
      }
    } catch (dbErr) {
      console.warn('[Out Route] DB verification error:', dbErr);
    }
  }

  if (!allowed) {
    return NextResponse.json({ error: 'Invalid or disallowed destination URL' }, { status: 400 });
  }

  const session = await getSession();
  const userId = session?.userId && session.userId !== '00000000-0000-0000-0000-000000000001' ? session.userId : null;

  try {
    // Record click log
    await db`
      insert into clicks (user_id, bot, episode_id, dest_url)
      values (${userId}, ${bot}, ${episodeId}, ${destUrl})
    `;
  } catch (err) {
    console.warn('[Out Route] Click log error:', err);
  }

  const clickref = `${bot || 'bot'}-${episodeId || 'chat'}`;
  const finalRedirect = affiliateWrap(destUrl, clickref);

  return NextResponse.redirect(finalRedirect, 302);
}
