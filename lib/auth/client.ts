// @/lib/auth/client.ts
// The browser-side auth client. The login screen calls these; everything else
// reads the session on the server, so there is no React context to provide.

'use client';

import { createAuthClient } from 'better-auth/react';

// baseURL defaults to the current origin.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;

/**
 * One-click sign-in for a seeded demo account. Not part of the generated
 * client because it's a custom endpoint (see lib/auth/demoLogin.ts), and it
 * only exists outside production.
 */
export async function demoLogin(email: string): Promise<void> {
  const res = await fetch('/api/auth/demo-login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? 'Demo sign-in failed.');
  }
}
