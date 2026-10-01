import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { env } from './env';
import { db } from './db';

export interface UserSession {
  userId: string;
  email: string;
  cohort: 'cadre' | 'public';
  isAdult: boolean;
  ukResident?: boolean;
}

const COOKIE_NAME = 'guitarbot_session';
const SECRET_KEY = new TextEncoder().encode(env.SESSION_SECRET || 'default-super-secret-session-key-32-chars-min');

// Default admin/dev user for zero-friction local testing
export const DEV_ADMIN_USER: UserSession = {
  userId: '00000000-0000-0000-0000-000000000001',
  email: 'admin@ryff.local',
  cohort: 'cadre',
  isAdult: true,
  ukResident: true,
};

export async function ensureUserExists(session: UserSession): Promise<void> {
  try {
    await db`
      insert into users (id, email, consented_at, is_adult, uk_resident, cohort)
      values (
        ${session.userId},
        ${session.email},
        now(),
        ${session.isAdult},
        ${session.ukResident ?? true},
        ${session.cohort}
      )
      on conflict (id) do update set email = excluded.email
    `;
  } catch (err) {
    console.warn('[Session] Failed to upsert user record:', err);
  }
}

export async function createSessionToken(payload: UserSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      cohort: (payload.cohort as 'cadre' | 'public') || 'cadre',
      isAdult: Boolean(payload.isAdult),
      ukResident: payload.ukResident !== undefined ? Boolean(payload.ukResident) : undefined,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (token) {
      const session = await verifySessionToken(token);
      if (session) return session;
    }

    // In local development or if testing on localhost, automatically return dev admin user if no cookie is present
    if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_AUTH === 'true') {
      return DEV_ADMIN_USER;
    }

    return null;
  } catch {
    // If cookies() fails outside request context, return dev user in non-prod
    if (process.env.NODE_ENV !== 'production') {
      return DEV_ADMIN_USER;
    }
    return null;
  }
}

export async function setSessionCookie(session: UserSession): Promise<void> {
  const token = await createSessionToken(session);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
