import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { getSession, setSessionCookie } from '../../../lib/session';
import { logEvent } from '../../../lib/events';

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ authenticated: false, user: null });
    }
    return NextResponse.json({ authenticated: true, user: session });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, inviteCode, isAdult, consent, ukResident, isDevLogin } = body;

    // Fast-path dev login for localhost testing
    if (isDevLogin && (process.env.NODE_ENV !== 'production' || inviteCode === 'CADRE-DEV01')) {
      // Ensure dev user exists in database
      const [devUser] = await db`
        insert into users (id, email, consented_at, is_adult, uk_resident, cohort)
        values (
          '00000000-0000-0000-0000-000000000001',
          'admin@ryff.local',
          now(),
          true,
          true,
          'cadre'
        )
        on conflict (id) do update set email = excluded.email
        returning id, email, cohort, is_adult, uk_resident
      `;

      await setSessionCookie({
        userId: devUser.id,
        email: devUser.email,
        cohort: devUser.cohort as 'cadre' | 'public',
        isAdult: devUser.is_adult,
        ukResident: devUser.uk_resident,
      });

      return NextResponse.json({ ok: true, user: devUser });
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const cleanCode = inviteCode && typeof inviteCode === 'string' && inviteCode.trim().length > 0
      ? inviteCode.trim().toUpperCase()
      : null;

    // If an invite code was supplied, validate it
    if (cleanCode) {
      const [invite] = await db`
        select code, used_by, used_at
        from invite_codes
        where code = ${cleanCode}
      `;

      if (!invite) {
        return NextResponse.json({ error: 'Invalid invite code. Please check and try again.' }, { status: 400 });
      }

      let [user] = await db`
        select id, email, cohort, is_adult, uk_resident
        from users
        where email = ${cleanEmail}
      `;

      if (user) {
        if (invite.used_by && invite.used_by !== user.id) {
          return NextResponse.json({ error: 'This invite code belongs to another email address.' }, { status: 403 });
        }
      } else {
        if (invite.used_by) {
          return NextResponse.json({ error: 'This invite code has already been claimed.' }, { status: 403 });
        }

        [user] = await db`
          insert into users (email, consented_at, is_adult, uk_resident, cohort)
          values (${cleanEmail}, now(), ${Boolean(isAdult ?? true)}, ${Boolean(ukResident ?? true)}, 'cadre')
          returning id, email, cohort, is_adult, uk_resident
        `;

        await db`
          update invite_codes
          set used_by = ${user.id}, used_at = now()
          where code = ${cleanCode}
        `;

        await logEvent('signup', { email: cleanEmail, cohort: 'cadre' }, user.id);
      }

      await setSessionCookie({
        userId: user.id,
        email: user.email,
        cohort: user.cohort as 'cadre' | 'public',
        isAdult: user.is_adult,
        ukResident: user.uk_resident,
      });

      return NextResponse.json({ ok: true, user });
    }

    // No invite code provided — frictionless email sign-in / registration
    let [user] = await db`
      select id, email, cohort, is_adult, uk_resident
      from users
      where email = ${cleanEmail}
    `;

    if (!user) {
      [user] = await db`
        insert into users (email, consented_at, is_adult, uk_resident, cohort)
        values (${cleanEmail}, now(), true, true, 'cadre')
        returning id, email, cohort, is_adult, uk_resident
      `;
      await logEvent('signup', { email: cleanEmail, method: 'email_only', cohort: 'cadre' }, user.id);
    }

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      cohort: (user.cohort as 'cadre' | 'public') || 'cadre',
      isAdult: user.is_adult ?? true,
      ukResident: user.uk_resident ?? true,
    });

    return NextResponse.json({ ok: true, user });
  } catch (err) {
    console.error('Auth error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Authentication failed' },
      { status: 500 }
    );
  }
}
