import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, clearSessionCookie } from '@/lib/session';

export async function POST() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Delete user row which cascades deletions for rig_items, messages, usage_daily
    await db`
      delete from users
      where id = ${session.userId}
    `;

    await clearSessionCookie();

    return NextResponse.json({ ok: true, message: 'Account and associated data deleted successfully.' });
  } catch (err) {
    console.error('Account deletion error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Account deletion failed' },
      { status: 500 }
    );
  }
}
