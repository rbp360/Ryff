import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/session';
import { undoAssistantAction } from '../../../../lib/command/executor';
import { z } from 'zod';

const undoSchema = z.object({
  actionId: z.number(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rawBody = await request.json();
    const parsed = undoSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message || 'Invalid undo payload' },
        { status: 400 }
      );
    }

    const { actionId } = parsed.data;
    const result = await undoAssistantAction(session.userId, actionId);

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[API /api/command/undo] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to undo action' },
      { status: 500 }
    );
  }
}
