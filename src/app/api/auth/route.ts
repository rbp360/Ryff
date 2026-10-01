import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { setSessionCookie, DEV_ADMIN_USER } from '../../../lib/session';
import { logEvent } from '../../../lib/events';

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

    if (!email || !inviteCode) {
      return NextResponse.json({ error: 'Email and invite code are required.' }, { status: 400 });
    }

    if (!isAdult) {
      return NextResponse.json({ error: 'You must confirm you are 18 or older to use GuitarBot.' }, { status: 400 });
    }

    if (!consent) {
      return NextResponse.json({ error: 'You must consent to terms and privacy notice to continue.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = inviteCode.trim().toUpperCase();

    // Check invite code
    const [invite] = await db`
      select code, used_by, used_at
      from invite_codes
      where code = ${cleanCode}
    `;

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite code. Please check and try again.' }, { status: 400 });
    }

    // Check if user already exists
    let [user] = await db`
      select id, email, cohort, is_adult, uk_resident
      from users
      where email = ${cleanEmail}
    `;

    if (user) {
      // Returning user signing in with their valid invite code
      if (invite.used_by && invite.used_by !== user.id) {
        return NextResponse.json({ error: 'This invite code belongs to another email address.' }, { status: 403 });
      }
    } else {
      // New user signup
      if (invite.used_by) {
        return NextResponse.json({ error: 'This invite code has already been claimed.' }, { status: 403 });
      }

      [user] = await db`
        insert into users (email, consented_at, is_adult, uk_resident, cohort)
        values (${cleanEmail}, now(), ${Boolean(isAdult)}, ${Boolean(ukResident)}, 'cadre')
        returning id, email, cohort, is_adult, uk_resident
      `;

      // Mark invite code as used
      await db`
        update invite_codes
        set used_by = ${user.id}, used_at = now()
        where code = ${cleanCode}
      `;

      await logEvent('signup', { email: cleanEmail, cohort: 'cadre' }, user.id);
    }

    // Set signed JWT session cookie
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      cohort: user.cohort as 'cadre' | 'public',
      isAdult: user.is_adult,
      ukResident: user.uk_resident,
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
