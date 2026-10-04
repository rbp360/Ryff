import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/session';
import { skipAssistantAction } from '../../../../lib/command/executor';
import { z } from 'zod';

const skipSchema = z.object({
  actionId: z.number(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rawBody = await request.json();
    const parsed = skipSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message || 'Invalid payload' },
        { status: 400 }
      );
    }

    const { actionId } = parsed.data;
    const result = await skipAssistantAction(session.userId, actionId);

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[API /api/command/skip] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to skip action' },
      { status: 500 }
    );
  }
}
