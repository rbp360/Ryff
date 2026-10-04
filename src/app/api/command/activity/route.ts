import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/session';
import { getAssistantActivity } from '../../../../lib/command/executor';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.min(50, Math.max(1, parseInt(limitParam, 10))) : 20;

  try {
    const activity = await getAssistantActivity(session.userId, limit);
    return NextResponse.json({
      ok: true,
      activity,
    });
  } catch (err: unknown) {
    console.error('[API /api/command/activity] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}
