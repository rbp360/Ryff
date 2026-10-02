import { NextRequest, NextResponse } from 'next/server';
import { getSession, ensureUserExists } from '@/lib/session';
import { getUserPreferences, updateUserPreferences } from '@/lib/personalization';
import { z } from 'zod';

const updatePreferencesSchema = z.object({
  favoritePlayers: z.array(z.string()).optional(),
  followedBrands: z.array(z.string()).optional(),
  reverbRegion: z.enum(['UK_ONLY', 'SHIPS_TO_UK', 'US_ONLY', 'WORLDWIDE']).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureUserExists(session);
  const preferences = await getUserPreferences(session.userId);

  return NextResponse.json(preferences);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureUserExists(session);

  try {
    const body = await request.json();
    const parsed = updatePreferencesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid preferences payload' }, { status: 400 });
    }

    const updated = await updateUserPreferences(session.userId, parsed.data);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
