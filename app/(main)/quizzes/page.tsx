// @/app/(main)/quizzes/page.tsx
// Quiz selection. Marks the ones already earned so a retake is an explicit
// choice rather than a surprise.

import { requireSessionUser } from '@/lib/auth/session';
import { listCertifications, listQuizzes } from '@/prisma/queries';
import { QuizCard } from '@/components/quiz/QuizCard';

export default async function QuizzesPage() {
  const user = await requireSessionUser();
  const [quizzes, certifications] = await Promise.all([
    listQuizzes(),
    listCertifications(user.id),
  ]);

  const earned = new Set(certifications.map((c) => c.quizId));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Quizzes</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Pass one to earn a certificate and mark the skill as proven.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {quizzes.map((quiz) => (
          <QuizCard key={quiz.id} quiz={quiz} earned={earned.has(quiz.id)} />
        ))}
      </div>
    </div>
  );
}
