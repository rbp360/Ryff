import { NextRequest, NextResponse } from 'next/server';
import { logEvent, EventName } from '../../../lib/events';
import { getSession } from '../../../lib/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, props } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid event name' }, { status: 400 });
    }

    const session = await getSession();
    await logEvent(name as EventName, props || {}, session?.userId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Event recording failed' },
      { status: 500 }
    );
  }
}
