import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/session';
import { confirmAssistantAction } from '../../../../lib/command/executor';
import { z } from 'zod';

const confirmSchema = z.object({
  actionIds: z.array(z.number()).optional(),
  actionId: z.number().optional(),
  edits: z.record(z.string(), z.any()).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rawBody = await request.json();
    const parsed = confirmSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message || 'Invalid confirm payload' },
        { status: 400 }
      );
    }

    const { actionIds, actionId, edits } = parsed.data;
    const targetIds: number[] = [];

    if (actionId) {
      targetIds.push(actionId);
    }
    if (Array.isArray(actionIds)) {
      for (const id of actionIds) {
        if (!targetIds.includes(id)) targetIds.push(id);
      }
    }

    if (targetIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one actionId or actionIds array is required' },
        { status: 400 }
      );
    }

    const confirmed = [];
    const failed = [];

    for (const id of targetIds) {
      try {
        const editForId = edits ? edits[String(id)] || edits[id] : undefined;
        const res = await confirmAssistantAction(session.userId, id, editForId);
        confirmed.push(res);
      } catch (err: unknown) {
        failed.push({
          actionId: id,
          error: err instanceof Error ? err.message : 'Execution failed',
        });
      }
    }

    const partialSuccess = failed.length > 0 && confirmed.length > 0;
    const ok = confirmed.length > 0;

    if (!ok && failed.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: failed[0].error,
          failed,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      partialSuccess,
      confirmed,
      failed: failed.length > 0 ? failed : undefined,
    });
  } catch (err: unknown) {
    console.error('[API /api/command/confirm] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to confirm action' },
      { status: 500 }
    );
  }
}
