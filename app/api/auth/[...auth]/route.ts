// @/app/api/auth/[...auth]/route.ts
// ⚠️  HACKATHON PLACEHOLDER AUTH — see the warning in @/lib/auth/session.
//
// A catch-all so the whole auth surface is one file: POST /api/auth/login and
// POST /api/auth/logout. When this is replaced by a real provider, that
// provider's handler takes over this same path (e.g. NextAuth exports GET and
// POST from here) and nothing else in the app has to move.

import { NextResponse } from 'next/server';
import { createSession, destroySession } from '@/lib/auth/session';
import { findOrCreateUserByEmail } from '@/prisma/queries';

export async function POST(request: Request, { params }: { params: Promise<{ auth: string[] }> }) {
  const { auth } = await params;
  const action = auth[0];

  switch (action) {
    case 'login':
      return login(request);
    case 'logout':
      await destroySession();
      return NextResponse.json({ ok: true });
    default:
      return NextResponse.json({ error: `Unknown auth action: ${action}` }, { status: 404 });
  }
}

async function login(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    name?: string;
  } | null;

  const email = body?.email?.trim();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }

  // No password, no verification: first sight of an email creates the account.
  // Fine for a demo, not fine for anything else.
  const name = body?.name?.trim() || email.split('@')[0];
  const user = await findOrCreateUserByEmail(email, name);

  await createSession(user.id);
  return NextResponse.json({ userId: user.id, name: user.name });
}
