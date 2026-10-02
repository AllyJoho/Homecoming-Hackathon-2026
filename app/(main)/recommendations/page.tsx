// @/app/(main)/recommendations/page.tsx
// Job matches: real listings, ranked against the student's skills.
//
// Ranked HERE, on the server, during the render — no button, no spinner, no
// cost. That's possible because the model's judgment was already paid for at
// ingest: each listing's skills carry a 1-5 weight assigned when it was
// extracted, so ranking is arithmetic over stored numbers (@/lib/jobs/match).
//
// There used to be a "Find my matches" button that spent ~$0.055 and 16s per
// press on an Opus ranking. The weights replaced it. The remaining AI on this
// page is behind "Load more listings", which extracts newly fetched listings.

import { requireSessionUser } from '@/lib/auth/session';
import { buildProfile } from '@/lib/profile/buildProfile';
import { matchJobs } from '@/lib/jobs/match';
import { listJobs, listQuizzes, listTrackedJobIds } from '@/prisma/queries';
import { PageHeader } from '@/components/ui';
import { RecommendationsPanel } from './RecommendationsPanel';

// Listings are stored permanently and "Load more listings" calls
// router.refresh(), which must see what it just wrote.
export const dynamic = 'force-dynamic';

export default async function RecommendationsPage() {
  const user = await requireSessionUser();
  const profile = await buildProfile(user.id);
  if (!profile) throw new Error(`No profile for session user ${user.id}`);

  const [quizzes, jobs, trackedJobIds] = await Promise.all([
    listQuizzes(),
    listJobs(),
    listTrackedJobIds(user.id),
  ]);

  // skill slug → quiz id, so "not proven yet" chips can link to the quiz that
  // would fix them. Built here because the quiz list is server-side data.
  const quizBySkill = Object.fromEntries(quizzes.map((quiz) => [quiz.skillSlug, quiz.id]));

  // Anything with at least some overlap. A profile with no skills scores
  // everything at 0 and gets the unranked browse list instead.
  const matches = matchJobs(jobs, profile, { minScore: 1 });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Job matches"
        description={describe(jobs.length, matches.length, profile.skills.length)}
      />

      <RecommendationsPanel
        matches={matches}
        jobs={jobs}
        skills={profile.skills}
        quizBySkill={quizBySkill}
        trackedJobIds={trackedJobIds}
      />
    </div>
  );
}

function describe(jobs: number, matches: number, skills: number): string {
  if (jobs === 0) return 'No listings stored yet — load some to get started.';
  if (skills === 0) {
    return `${jobs} real listings stored. Add a few skills and they'll rank themselves against you.`;
  }
  if (matches === 0) {
    return `${jobs} real listings stored, none overlapping your ${skills} skill${skills === 1 ? '' : 's'} yet.`;
  }
  return `${matches} of ${jobs} real listings overlap your ${skills} skill${skills === 1 ? '' : 's'}, best fit first.`;
}
