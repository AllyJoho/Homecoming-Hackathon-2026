// @/lib/auth/session.ts
// Resolves the Better Auth session into the shape the app consumes. The
// exported contract is unchanged from the placeholder version this replaced
// (getSessionUser / requireSessionUser / unauthorized), so route handlers and
// server components did not have to move.
//
// The cookie is now signed by Better Auth and carries an opaque session token,
// not a bare user id — forging one means forging the signature.

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  isDemo: boolean;
}

function toSessionUser(user: Record<string, unknown>): SessionUser {
  return {
    id: user.id as string,
    name: (user.name as string) ?? '',
    email: user.email as string,
    isDemo: user.isDemo === true,
  };
}

/**
 * The signed-in user, or null. Safe to call from any server context.
 *
 * Better Auth writes into the domain `User` table, so `id` here is already the
 * id every foreign key in the schema references — no mapping step.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const result = await auth.api.getSession({ headers: await headers() });
  return result?.user ? toSessionUser(result.user as Record<string, unknown>) : null;
}

/**
 * For pages that require a session. Redirects to /login when there isn't one,
 * so callers can treat the return value as always present.
 */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
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
