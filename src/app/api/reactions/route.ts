import { NextRequest, NextResponse } from 'next/server';
import { getSession, ensureUserExists } from '@/lib/session';
import { recordItemReaction, removeItemReaction } from '@/lib/personalization';
import { z } from 'zod';

const reactionSchema = z.object({
  itemId: z.number(),
  reaction: z.enum(['like', 'dislike']).nullable(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureUserExists(session);

  try {
    const body = await request.json();
    const parsed = reactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid reaction payload' }, { status: 400 });
    }

    const { itemId, reaction } = parsed.data;

    if (reaction === null) {
      await removeItemReaction(session.userId, itemId);
      return NextResponse.json({ success: true, reaction: null });
    }

    const result = await recordItemReaction(session.userId, itemId, reaction);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
