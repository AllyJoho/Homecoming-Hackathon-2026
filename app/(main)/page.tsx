// @/app/(main)/page.tsx
// Home: the quizzes a student can take right now, then every skill on the
// site in three sections — Certified Skills (quiz passed), My Skills
// (claimed) and Skills (the rest of the vocabulary).
//
// The quiz list lives here rather than behind /quizzes because the plan puts
// quiz selection on the home screen. /quizzes still exists and still works —
// this is the same list, where a student actually lands.
//
// A server component, so the catalog is read straight from the database — no
// loading state, no client fetch. SkillBoard is the one client component, and
// it owns only the search filter and the optimistic add/remove.

import Link from 'next/link';
import { requireSessionUser } from '@/lib/auth/session';
import { listQuizzes, listSkillCatalog } from '@/prisma/queries';
import { QuizCard } from '@/components/quiz/QuizCard';
import { SkillBoard } from '@/components/skills/SkillBoard';

export default async function HomePage() {
  const user = await requireSessionUser();
  const [catalog, quizzes] = await Promise.all([listSkillCatalog(user.id), listQuizzes()]);

  const claimed = catalog.certified.length + catalog.mine.length;

  // The certified section already carries the quiz that earned each
  // certificate, so "have I passed this one?" needs no second query — and no
  // dedupe, since Certification is unique per user per skill and upserted on
  // a retake rather than duplicated.
  const earned = new Set(catalog.certified.map((skill) => skill.quizId).filter(Boolean));

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
        <Link href="/recommendations" className="text-sm font-medium underline underline-offset-4">
          See job matches
        </Link>
      </header>

      {/* Above the skill catalog on purpose: only a couple of the forty-odd
          skills have an authored quiz, so the question "what can I actually
          get certified in today?" is the one a student can act on, and the
          catalog below buries it. */}
      <section className="flex flex-col gap-4">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Quizzes</h2>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {quizzes.length}
          </span>
          <p className="w-full text-sm text-zinc-600 dark:text-zinc-400">
            Pass one to earn a certificate and mark the skill as certified.
          </p>
        </header>

        {quizzes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            No quizzes available yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <QuizCard key={quiz.id} quiz={quiz} earned={earned.has(quiz.id)} />
            ))}
          </div>
        )}
      </section>

      <SkillBoard catalog={catalog} />
    </div>
  );
}
