import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, ensureUserExists } from '@/lib/session';
import { registerCustomBot, getBot } from '@/lib/bots';
import { BotDossier } from '@/types/bot';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const botIdParam = searchParams.get('id');

    // If botIdParam matches a preset bot or registered custom bot
    if (botIdParam) {
      const resolved = getBot(botIdParam);
      if (resolved && resolved.id === botIdParam) {
        return NextResponse.json({ bot: resolved });
      }
    }

    if (!session?.userId) {
      return NextResponse.json({ bot: null });
    }

    await ensureUserExists(session);

    // Query active bot from user_bots
    const rows = await db<{ id: string; name: string; dossier: BotDossier; is_active: boolean }[]>`
      select id, name, dossier, is_active
      from user_bots
      where user_id = ${session.userId} and is_active = true
      order by updated_at desc
      limit 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ bot: null });
    }

    const userBot = rows[0].dossier;
    registerCustomBot(userBot);

    return NextResponse.json({ bot: userBot });
  } catch (err) {
    console.error('[GET /api/persona] Error fetching persona:', err);
    return NextResponse.json({ error: 'Failed to fetch persona' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureUserExists(session);

    const body = await request.json();
    const { dossier } = body as { dossier: BotDossier };

    if (!dossier || !dossier.name) {
      return NextResponse.json({ error: 'Invalid dossier payload' }, { status: 400 });
    }

    // Deactivate previous custom bots for this user
    await db`
      update user_bots
      set is_active = false, updated_at = now()
      where user_id = ${session.userId}
    `;

    // Insert new active custom bot
    const botId = dossier.id || `user_${Date.now().toString(36)}`;
    dossier.id = botId;
    dossier.isUserProxy = true;

    await db`
      insert into user_bots (id, user_id, name, dossier, is_active, created_at, updated_at)
      values (
        ${botId},
        ${session.userId},
        ${dossier.name},
        ${JSON.stringify(dossier)},
        true,
        now(),
        now()
      )
      on conflict (id) do update set
        name = excluded.name,
        dossier = excluded.dossier,
        is_active = true,
        updated_at = now()
    `;

    // Register in memory for current runtime
    registerCustomBot(dossier);

    return NextResponse.json({
      success: true,
      bot: dossier,
    });
  } catch (err: unknown) {
    console.error('[POST /api/persona] Error saving persona:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save persona' },
      { status: 500 }
    );
  }
}
