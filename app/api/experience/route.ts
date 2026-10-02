// @/app/api/experience/route.ts
// Add one experience entry by hand. No AI — this is the student typing.

import { NextResponse } from 'next/server';

import { getSessionUser, unauthorized } from '@/lib/auth/session';
import { parseExperienceInput } from '@/lib/profile/experienceInput';
import { createExperience } from '@/prisma/queries';

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const parsed = parseExperienceInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const experience = await createExperience(user.id, parsed.input);
  return NextResponse.json({ experience }, { status: 201 });
}
