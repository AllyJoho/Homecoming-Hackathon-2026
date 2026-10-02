// @/lib/auth/session.ts
// ⚠️  HACKATHON PLACEHOLDER AUTH. The cookie holds a bare user id and is not
// signed, so anyone can mint one by hand. It's here so the rest of the app can
// be written against a real session API; swap the three cookie functions for
// a provider (NextAuth / Clerk / BYU CAS) and nothing else changes.

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { getUserById } from '@/lib/db/queries';

const COOKIE_NAME = 'hh_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // one week

/** The signed-in user's id, or null. Safe to call from any server context. */
export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

/** The signed-in user row, or null if the cookie is absent or stale. */
export async function getSessionUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  // A cookie can outlive its user (e.g. after `npm run db:reset`), so this is
  // a real lookup rather than trusting the cookie.
  return getUserById(userId);
}

/**
 * For pages and routes that require a session. Redirects to /login when there
 * isn't one, so callers can treat the return value as always present.
 */
export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

// Cookie *writes* are only legal inside a Route Handler or a Server Action —
// calling these from a server component throws.

export async function createSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, userId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * The 401 for route handlers.
 *
 * Route handlers must NOT use `requireSessionUser` — its redirect becomes a
 * 307 to /login, which `fetch` follows transparently, so the client sees a
 * 200 of HTML and fails on `response.json()`. Pair `getSessionUser()` with
 * this instead:
 *
 *     const user = await getSessionUser();
 *     if (!user) return unauthorized();
 */
export function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
}
