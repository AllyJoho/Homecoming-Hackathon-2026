// @/app/(main)/page.tsx
// Home: where this student stands, and the one thing to do next.
//
// This used to be the whole skills catalog — forty-odd cards in four sections,
// which made "what have I earned" and "what is there to learn" the same screen.
// The catalog moved to /skills; what's left here is the student's own state:
// the career their skills point at, what they've certified, and what they've
// claimed but not yet proven.
//
// Read-only by design. Every card links to the page that can change it —
// adding and removing skills is /skills' job, and a dashboard that also
// mutates is how the old home ended up doing two things at once.
//
// A server component throughout: career matching is arithmetic over authored
// weights (@/lib/careers/match) and the rest is a database read, so there's no
// loading state and no client JavaScript on this page at all.

import Link from 'next/link';
import { requireSessionUser } from '@/lib/auth/session';
import { buildProfile } from '@/lib/profile/buildProfile';
import { matchCareers } from '@/lib/careers/match';
import { listCareers, listQuizzes, listSkillCatalog } from '@/prisma/queries';
import { CareerMatchCard } from '@/components/careers/CareerMatchCard';
import { SkillSection } from '@/components/skills/SkillSection';
import { Button, EmptyState } from '@/components/ui';

export default async function HomePage() {
  const user = await requireSessionUser();

  const [catalog, profile, careers, quizzes] = await Promise.all([
    listSkillCatalog(user.id),
    buildProfile(user.id),
    listCareers(),
    listQuizzes(),
  ]);
  if (!profile) throw new Error(`No profile for session user ${user.id}`);

  const quizBySkill = Object.fromEntries(quizzes.map((quiz) => [quiz.skillSlug, quiz.id]));

  // Just the headline — the full ranking is /careers. A 0% top match is no
  // answer, so it falls through to the empty state instead.
  const headline = matchCareers(careers, profile, 1).filter((match) => match.score > 0);

  const claimed = catalog.certified.length + catalog.mine.length;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Hi, {user.name.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {catalog.certified.length > 0
              ? `${catalog.certified.length} certified of ${claimed} skills you've claimed — your matches update as you earn more.`
              : 'Add the skills you have, then prove them with a quiz.'}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link href="/skills">
            <Button size="sm" variant="secondary">
              Manage skills
            </Button>
          </Link>
          <Link href="/recommendations">
            <Button size="sm">See job matches</Button>
          </Link>
        </div>
      </header>

      {headline.length > 0 ? (
        <CareerMatchCard matches={headline} quizBySkill={quizBySkill} />
      ) : (
        <EmptyState
          title="Nothing to point at yet"
          description="Add a few skills and this shows the career they add up to, plus the quiz that would move you along it."
          action={
            <Link href="/skills">
              <Button size="sm">Add skills</Button>
            </Link>
          }
        />
      )}

      {/* Read-only: no onAdd/onRemove, so these render as plain cards with
          their certificate and quiz links. Certified cards keep their tag
          because it names the LEVEL, which the heading doesn't; the claimed
          ones drop theirs, since "My skill" under a "My Skills" heading is the
          same word twice. */}
      <SkillSection
        title="Certified Skills"
        blurb="Proven — you passed the quiz. Job matches weight these highest."
        skills={catalog.certified}
        emptyMessage="Nothing certified yet. Pass a quiz and the skill moves up here."
      />

      <SkillSection
        title="My Skills"
        blurb="Claimed but not yet proven. Each one's quiz is the fastest way to raise your matches."
        skills={catalog.mine}
        showClaimedTag={false}
        emptyMessage="No claimed skills yet — add the ones you already have from the skills page."
      />
    </div>
  );
}
