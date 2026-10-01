import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { getSession } from '../../../lib/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, kind = 'bad_answer', feedbackText } = body;

    const session = await getSession();
    const userId = session?.userId && session.userId !== '00000000-0000-0000-0000-000000000001' ? session.userId : null;

    // Record feedback entry
    await db`
      insert into feedback (user_id, kind, body)
      values (${userId}, ${kind}, ${feedbackText || null})
    `;

    // Flag message if ID was provided
    if (messageId) {
      await db`
        update messages
        set flagged = true
        where id = ${messageId}
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Feedback error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Feedback recording failed' },
      { status: 500 }
    );
  }
}
