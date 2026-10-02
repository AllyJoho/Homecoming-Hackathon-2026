// @/app/api/auth/demo-users/route.ts
// Lists the seeded demo accounts so the login screen can offer one-click
// sign-in buttons without hardcoding emails. Mirrors purchasing's dev-users
// route, and like that one it answers 404 in production — the demo-login
// endpoint it feeds doesn't exist there either.

import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const users = await prisma.user.findMany({
    where: { isDemo: true },
    select: { name: true, email: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ users });
}
