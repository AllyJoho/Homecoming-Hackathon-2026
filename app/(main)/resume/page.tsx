// @/app/(main)/resume/page.tsx
// Resume in, skills and structured experience out. The one place AI reads
// something a human wrote freely.
//
// Everything else in the app works from structured data: quizzes have answer
// keys, listings were already translated into slugs at ingest. A resume is the
// exception, and reading it is work no amount of arithmetic could do.
//
// Two things come out of one paste. The skills feed matching; the experience
// entries are what a rendered resume is built from, and are editable by hand
// afterwards — the model's parse is a first draft, not the record.

import { requireSessionUser } from '@/lib/auth/session';
import { buildProfile } from '@/lib/profile/buildProfile';
import { listExperiences, listQuizzes } from '@/prisma/queries';
import Link from 'next/link';
import { Button, PageHeader } from '@/components/ui';
import { ExperienceEditor } from '@/components/experience/ExperienceEditor';
import { ResumeReviewPanel } from '@/components/experience/ResumeReviewPanel';
import { ResumeForm } from './ResumeForm';

// The editor writes through API routes and calls router.refresh(), which has
// to see what it just wrote.
export const dynamic = 'force-dynamic';

export default async function ResumePage() {
  const user = await requireSessionUser();
  const profile = await buildProfile(user.id);
  if (!profile) throw new Error(`No profile for session user ${user.id}`);

  const [quizzes, experiences] = await Promise.all([
    listQuizzes(),
    listExperiences(user.id),
  ]);
  const quizBySkill = Object.fromEntries(quizzes.map((quiz) => [quiz.skillSlug, quiz.id]));

  const fromResume = profile.skills.filter((skill) => skill.source === 'RESUME').length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Resume"
        description={describe(fromResume, profile.skills.length, experiences.length)}
        actions={
          experiences.length > 0 && (
            <Link href="/resume/preview">
              <Button size="sm" variant="secondary">
                Preview &amp; print
              </Button>
            </Link>
          )
        }
      />
      <ResumeForm quizBySkill={quizBySkill} />
      <ExperienceEditor experiences={experiences} />
      {/* Below the editor, not above it: the review points at specific entries
          and the first thing a student does with it is scroll up and edit one.
          Hidden until there's something to read. */}
      {experiences.length > 0 && <ResumeReviewPanel entryCount={experiences.length} />}
    </div>
  );
}

function describe(fromResume: number, skills: number, entries: number): string {
  if (skills === 0 && entries === 0) {
    return 'Paste your resume and it becomes a skill profile and a set of experience entries — then every job listing ranks itself against you.';
  }
  const parts: string[] = [];
  if (entries > 0) parts.push(`${entries} experience ${entries === 1 ? 'entry' : 'entries'}`);
  if (fromResume > 0) parts.push(`${fromResume} of your ${skills} skills from a resume`);
  return `${parts.join(', ')}. Pasting a new resume replaces what the last one produced, and leaves anything you typed yourself alone.`;
}
