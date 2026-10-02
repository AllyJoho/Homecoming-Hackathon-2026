// @/app/(main)/recommendations/page.tsx
// AI job matches.
//
// The model call is triggered by the user rather than run during render: it
// costs money and takes seconds, so a page load shouldn't spend one. The page
// shell is a server component; the button and result list below it are client.

import { requireSessionUser } from '@/lib/auth/session';
import { buildProfile } from '@/lib/profile/buildProfile';
import { matchCareers } from '@/lib/careers/match';
import { listCareers, listQuizzes } from '@/prisma/queries';
import { CareerMatchCard } from '@/components/careers/CareerMatchCard';
import { RecommendationsPanel } from './RecommendationsPanel';

/** The headline career plus three alternates — see CareerMatchCard. */
const CAREER_MATCH_COUNT = 4;

export default async function RecommendationsPage() {
  const user = await requireSessionUser();
  const profile = await buildProfile(user.id);
  if (!profile) throw new Error(`No profile for session user ${user.id}`);

  const [quizzes, careers] = await Promise.all([listQuizzes(), listCareers()]);

  // skill slug → quiz id, so "not proven yet" chips can link to the quiz that
  // would fix them. Built here because the quiz list is server-side data.
  const quizBySkill = Object.fromEntries(quizzes.map((quiz) => [quiz.skillSlug, quiz.id]));

  // Free and synchronous, unlike the job ranking below it — so it renders with
  // the page instead of waiting for a button.
  const careerMatches = matchCareers(careers, profile, CAREER_MATCH_COUNT);
  const hasCareerMatch = (careerMatches[0]?.score ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Job matches</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Ranked against your {profile.skills.length} skill
          {profile.skills.length === 1 ? '' : 's'} and {profile.certifications.length} certificate
          {profile.certifications.length === 1 ? '' : 's'}.
        </p>
      </div>

      {hasCareerMatch && (
        <CareerMatchCard matches={careerMatches} quizBySkill={quizBySkill} />
      )}

      <RecommendationsPanel
        hasSkills={profile.skills.length > 0}
        quizBySkill={quizBySkill}
      />
    </div>
  );
}
