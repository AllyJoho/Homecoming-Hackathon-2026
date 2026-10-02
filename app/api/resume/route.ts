// @/app/api/resume/route.ts
// Reads a pasted resume and writes the skills it evidences onto the profile.
//
// POST only, and never during a render: one model call per press, and it
// mutates the profile. The write rules live in `saveResumeSkills` — a resume
// can upgrade a typed-in skill but can never overwrite a quiz pass.

import { NextResponse } from 'next/server';

import { getSessionUser, unauthorized } from '@/lib/auth/session';
import { AiError, aiReady, aiUnavailableReason } from '@/lib/ai/provider';
import { ResumeError, readResume } from '@/lib/profile/resume';
import { replaceResumeExperiences, saveResumeSkills } from '@/prisma/queries';

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  if (!aiReady('resume-extraction')) {
    return NextResponse.json({ error: aiUnavailableReason('resume-extraction') }, { status: 503 });
  }

  let text: unknown;
  try {
    ({ text } = (await request.json()) as { text?: unknown });
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  if (typeof text !== 'string') {
    return NextResponse.json({ error: 'Paste your resume text first.' }, { status: 400 });
  }

  try {
    const reading = await readResume(text);

    // Save even when the reading is empty: that legitimately clears skills and
    // entries a previous, wronger reading had added.
    const [saved, experienceCount] = await Promise.all([
      saveResumeSkills(
        user.id,
        reading.skills.map((skill) => ({ slug: skill.slug, evidence: skill.evidence })),
      ),
      replaceResumeExperiences(user.id, reading.experiences),
    ]);

    return NextResponse.json({ ...reading, saved, experienceCount });
  } catch (error) {
    // Both carry messages already written for the student to read.
    if (error instanceof ResumeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof AiError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
