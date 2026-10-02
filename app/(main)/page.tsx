// @/app/(main)/page.tsx
// Home: the student's skills, the certificates they've earned, and every quiz
// they can take.
//
// A server component, so the profile is read directly from the database — no
// loading state, no client fetch. The two interactive pieces (AddSkillForm,
// SkillList) are the only client components on the page.

import Link from 'next/link';
import { requireSessionUser } from '@/lib/auth/session';
import { buildProfile } from '@/lib/profile/buildProfile';
import { listQuizzes } from '@/lib/quiz/loadQuiz';
import { AddSkillForm } from '@/components/skills/AddSkillForm';
import { SkillList } from '@/components/skills/SkillList';
import { CertList } from '@/components/certifications/CertList';
import { QuizCard } from '@/components/quiz/QuizCard';
import { Card } from '@/components/ui';

export default async function HomePage() {
  const user = await requireSessionUser();
  const profile = await buildProfile(user.id);

  // The layout guard means the session is valid, so a missing profile here
  // would be a genuine inconsistency.
  if (!profile) throw new Error(`No profile for session user ${user.id}`);

  // Retaking a passed quiz mints a new certificate (one per attempt), so keep
  // only the newest per quiz. getProfile sorts newest-first, so the first one
  // seen for each quizId wins.
  const certifications = profile.certifications.filter(
    (cert, i, all) => all.findIndex((other) => other.quizId === cert.quizId) === i,
  );

  const quizzes = listQuizzes();
  const earned = new Set(certifications.map((cert) => cert.quizId));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Hi, {profile.name.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {certifications.length > 0
            ? 'Your matches update as you earn more certificates.'
            : 'Add the skills you have, then prove them with a quiz.'}
        </p>
      </div>

      <Card
        title="Your skills"
        action={
          // A styled Link rather than <Link><Button/></Link>: a button inside a
          // link is invalid HTML and gives keyboard users two tab stops.
          // Copy your Button's `secondary` + `sm` classes here so they match.
          <Link
            href="#quizzes"
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Prove a skill
          </Link>
        }
        footer={<AddSkillForm />}
      >
        <SkillList skills={profile.skills} />
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          A ✓ means you passed the quiz for it — job matches weight those higher.
        </p>
      </Card>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Certificates</h2>
          <Link
            href="/recommendations"
            className="text-sm font-medium underline underline-offset-4"
          >
            See job matches
          </Link>
        </div>
        <CertList certifications={certifications} />
      </section>

      <section id="quizzes" className="flex scroll-mt-6 flex-col gap-4">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Quizzes</h2>
        {quizzes.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No quizzes available yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {quizzes.map((quiz) => (
              <QuizCard key={quiz.id} quiz={quiz} earned={earned.has(quiz.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}