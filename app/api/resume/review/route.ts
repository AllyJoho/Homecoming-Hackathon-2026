// @/app/api/resume/review/route.ts
// Reviews the signed-in student's saved experience entries. Called by the
// review card on /resume (components/experience/ResumeReviewPanel).
//
// Reads the entries from the database rather than taking them in the body:
// unlike the reword route, which works on text still being typed, this reviews
// the resume as it stands — the same rows /resume/preview prints. So there is
// nothing to validate in the request, and no way to ask for a review of
// someone else's resume.
//
// Writes nothing. A review is advice; the student acts on it in the editor.

import { NextResponse } from 'next/server';

import { AiError, aiUnavailableReason } from '@/lib/ai/provider';
import { getSessionUser, unauthorized } from '@/lib/auth/session';
import { buildProfile } from '@/lib/profile/buildProfile';
import { ResumeReviewError, countWeaknesses, reviewResume } from '@/lib/profile/resumeReview';
import { listCareers, listExperiences } from '@/prisma/queries';

export async function POST() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const unavailable = aiUnavailableReason('resume-review');
  if (unavailable) return NextResponse.json({ error: unavailable }, { status: 503 });

  const [experiences, careers, profile] = await Promise.all([
    listExperiences(user.id),
    listCareers(),
    buildProfile(user.id),
  ]);

  if (experiences.length === 0) {
    return NextResponse.json(
      { error: 'Add an experience entry, or paste a resume, and this has something to review.' },
      { status: 422 },
    );
  }
  if (!profile) {
    // buildProfile only returns null when the user row is gone, which can't
    // happen for a live session — but the type says it can.
    return NextResponse.json({ error: 'Could not load your profile.' }, { status: 500 });
  }

  try {
    return NextResponse.json({ review: await reviewResume(experiences, careers, profile) });
  } catch (error) {
    if (error instanceof ResumeReviewError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    // The counted half needs no model, so a model failure still has something
    // worth showing rather than only an error.
    if (error instanceof AiError) {
      return NextResponse.json(
        { error: error.message, ...countWeaknesses(experiences) },
        { status: 502 },
      );
    }
    throw error;
  }
}
