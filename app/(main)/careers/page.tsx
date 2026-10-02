// @/app/(main)/careers/page.tsx
// "Which job family do my skills point at" — the whole 26-career catalog,
// ranked.
//
// Split off /recommendations deliberately: these are career *archetypes*
// scored by arithmetic, and sitting them above a list of real job listings
// made the top one read as a job. Different question, different page.
//
// No model call anywhere on this page. @/lib/careers/match is arithmetic over
// the authored weights, so everything here renders on load.

import { requireSessionUser } from '@/lib/auth/session';
import { buildProfile } from '@/lib/profile/buildProfile';
import { matchCareers } from '@/lib/careers/match';
import { listCareers, listQuizzes } from '@/prisma/queries';
import { CareerMatchCard } from '@/components/careers/CareerMatchCard';
import { CareerList } from '@/components/careers/CareerList';
import { Button, EmptyState, PageHeader } from '@/components/ui';
import Link from 'next/link';

export default async function CareersPage() {
  const user = await requireSessionUser();
  const profile = await buildProfile(user.id);
  if (!profile) throw new Error(`No profile for session user ${user.id}`);

  const [quizzes, careers] = await Promise.all([listQuizzes(), listCareers()]);
  const quizBySkill = Object.fromEntries(quizzes.map((quiz) => [quiz.skillSlug, quiz.id]));

  // Every career, not a top-N slice: the full ranking is the page.
  const matches = matchCareers(careers, profile, careers.length);
  const headline = matches.filter((match) => match.score > 0).slice(0, 1);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Career"
        description={
          profile.skills.length > 0
            ? `Scored against your ${profile.skills.length} skill${profile.skills.length === 1 ? '' : 's'}. Proven skills count double what self-reported ones do.`
            : 'Add a few skills and this ranks every career by how close you are.'
        }
      />

      {headline.length > 0 ? (
        <CareerMatchCard matches={headline} quizBySkill={quizBySkill} />
      ) : (
        <EmptyState
          title="Nothing to rank yet"
          description="Add the skills you already have, then prove them with a quiz. Careers reorder as you go."
          action={
            <Link href="/">
              <Button size="sm">Add skills</Button>
            </Link>
          }
        />
      )}

      <CareerList matches={matches} />
    </div>
  );
}
