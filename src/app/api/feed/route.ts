import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getPersonalizedFeed, getGlobalTopFeed } from '@/lib/personalization';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') || 'personalized';
  const category = searchParams.get('category') || 'all';
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

  const session = await getSession();

  // If user is logged in and requests personalized feed, serve personalized
  if (tab === 'personalized' && session?.userId) {
    const feed = await getPersonalizedFeed(session.userId, { limit, offset, category });
    return NextResponse.json({ tab: 'personalized', count: feed.length, feed });
  }

  // Otherwise serve global top buzz feed
  const feed = await getGlobalTopFeed({ limit, offset, category });
  return NextResponse.json({ tab: 'global', count: feed.length, feed });
}
