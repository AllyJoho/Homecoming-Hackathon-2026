// @/app/api/skills/route.ts
// Add and remove self-reported skills.
//
// POST   { skill: "JavaScript" }  → 201 with the normalized skill
// DELETE ?slug=javascript         → 204

import { NextResponse } from 'next/server';
import { getSessionUser, unauthorized } from '@/lib/auth/session';
import { addUserSkill, removeUserSkill } from '@/lib/db/queries';

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const body = (await request.json().catch(() => null)) as { skill?: string } | null;
  const raw = body?.skill?.trim();
  if (!raw) {
    return NextResponse.json({ error: 'A skill name is required.' }, { status: 400 });
  }

  const skill = await addUserSkill(user.id, raw);
  if (!skill) {
    // normalizeSkill returned null — the vocabulary doesn't have it. Saying so
    // is better than storing free text the recommender can't reason about.
    return NextResponse.json(
      { error: `"${raw}" isn't a skill we track yet. Try a language, framework, or tool.` },
      { status: 400 },
    );
  }

  return NextResponse.json(skill, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const slug = new URL(request.url).searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: 'A slug query parameter is required.' }, { status: 400 });
  }

  await removeUserSkill(user.id, slug);
  return new NextResponse(null, { status: 204 });
}
