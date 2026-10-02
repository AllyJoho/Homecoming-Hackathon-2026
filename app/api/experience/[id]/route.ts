// @/app/api/experience/[id]/route.ts
// Edit or remove one entry.
//
// Both answer 404 rather than 403 for someone else's row — the same rule the
// quiz result route follows, so an id's existence isn't confirmed to whoever
// guessed it.

import { NextResponse } from 'next/server';

import { getSessionUser, unauthorized } from '@/lib/auth/session';
import { parseExperienceInput } from '@/lib/profile/experienceInput';
import { deleteExperience, updateExperience } from '@/prisma/queries';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const parsed = parseExperienceInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const experience = await updateExperience(user.id, id, parsed.input);
  if (!experience) return NextResponse.json({ error: 'Entry not found.' }, { status: 404 });

  return NextResponse.json({ experience });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const deleted = await deleteExperience(user.id, id);
  if (!deleted) return NextResponse.json({ error: 'Entry not found.' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
