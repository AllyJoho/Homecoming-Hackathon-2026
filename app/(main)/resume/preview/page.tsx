// @/app/(main)/resume/preview/page.tsx
// The finished resume, ready to print.
//
// Everything on this page is already in the database — the experience entries
// from /resume and the skills from quizzes and resume reading. No model call
// here; rendering is rendering.

import Link from 'next/link';

import { requireSessionUser } from '@/lib/auth/session';
import { buildProfile } from '@/lib/profile/buildProfile';
import { listExperiences } from '@/prisma/queries';
import { Button, EmptyState, PageHeader } from '@/components/ui';
import { ResumeDocument } from '@/components/experience/ResumeDocument';
import { PrintButton } from './PrintButton';

export const dynamic = 'force-dynamic';

export default async function ResumePreviewPage() {
  const user = await requireSessionUser();
  const [profile, experiences] = await Promise.all([
    buildProfile(user.id),
    listExperiences(user.id),
  ]);
  if (!profile) throw new Error(`No profile for session user ${user.id}`);

  if (experiences.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Resume preview" />
        <EmptyState
          title="Nothing to render yet"
          description="Add some experience first — paste a resume or type an entry — and it shows up here formatted."
          action={
            <Link href="/resume">
              <Button size="sm">Add experience</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* `print:hidden` keeps the app chrome off the printed page. */}
      <div className="print:hidden">
        <PageHeader
          title="Resume preview"
          description="Only quiz-certified and resume-backed skills are printed — a claim you only typed in is left off."
          actions={
            <div className="flex items-center gap-2">
              <Link href="/resume">
                <Button variant="secondary" size="sm">
                  Edit entries
                </Button>
              </Link>
              <PrintButton />
            </div>
          }
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-sm dark:border-zinc-800 print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
        <ResumeDocument
          name={profile.name}
          email={user.email}
          experiences={experiences}
          skills={profile.skills}
        />
      </div>
    </div>
  );
}
