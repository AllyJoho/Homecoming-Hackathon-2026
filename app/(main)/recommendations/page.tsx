// @/app/(main)/recommendations/page.tsx
// AI job matches.
//
// The model call is triggered by the user rather than run during render: it
// costs money and takes seconds, so a page load shouldn't spend one. The page
// shell is a server component; the button and result list below it are client.

import { requireSessionUser } from '@/lib/auth/session';
import { buildProfile } from '@/lib/profile/buildProfile';
import { listQuizzes } from '@/prisma/queries';
import { RecommendationsPanel } from './RecommendationsPanel';

export default async function RecommendationsPage() {
  const user = await requireSessionUser();
  const profile = await buildProfile(user.id);
  if (!profile) throw new Error(`No profile for session user ${user.id}`);

  // skill slug → quiz id, so "not proven yet" chips can link to the quiz that
  // would fix them. Built here because the quiz list is server-side data.
  const quizBySkill = Object.fromEntries(
    (await listQuizzes()).map((quiz) => [quiz.skillSlug, quiz.id]),
  );

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

      <RecommendationsPanel
        hasSkills={profile.skills.length > 0}
        quizBySkill={quizBySkill}
      />
    </div>
  );
}
