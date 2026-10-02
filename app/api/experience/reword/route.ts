// @/app/api/experience/reword/route.ts
// Rewords the bullets of one experience entry. Called by the reword panel in
// components/experience/BulletReword.
//
// Takes the entry from the request body rather than an id on the URL, because
// the student presses this while the form is open — often on an entry they
// haven't saved yet, and always on the text currently in the textarea rather
// than the text in the database. There is nothing here to own or look up, so
// there is nothing to authorise beyond "is someone signed in": the route reads
// no stored rows and writes none.
//
// Writes nothing, deliberately. The response is a set of suggestions; the
// student accepts the ones they want and the existing create/update routes
// save them. See @/lib/profile/reword for why the guard sits in between.

import { NextResponse } from 'next/server';

import { z } from 'zod';

import { AiError, aiUnavailableReason } from '@/lib/ai/provider';
import { getSessionUser, unauthorized } from '@/lib/auth/session';
import { MAX_REWORD_BULLETS, RewordError, rewordBullets } from '@/lib/profile/reword';

const BodySchema = z.object({
  kind: z.enum(['WORK', 'PROJECT', 'EDUCATION', 'LEADERSHIP']),
  // Blank is allowed: an entry being typed may not have both yet, and the
  // bullets are what's being reworded.
  title: z.string().trim().max(200).default(''),
  organization: z.string().trim().max(200).default(''),
  bullets: z.array(z.string().max(600)).min(1).max(MAX_REWORD_BULLETS),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Malformed reword request.' }, { status: 400 });
  }

  // This task's provider, not the global default — it has its own env override.
  const unavailable = aiUnavailableReason('experience-reword');
  if (unavailable) return NextResponse.json({ error: unavailable }, { status: 503 });

  try {
    const bullets = await rewordBullets(parsed.data);
    return NextResponse.json({ bullets });
  } catch (error) {
    // Both carry messages already written for the student to read.
    if (error instanceof RewordError || error instanceof AiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error instanceof RewordError ? 422 : 502 },
      );
    }
    throw error;
  }
}
