// @/app/(main)/quizzes/[quizId]/page.tsx
// The quiz runner's host page. Loads the quiz server-side and passes the
// answer-stripped version to the client component — `toPublicQuiz` is what
// keeps the answer key out of the page payload.

import { notFound } from 'next/navigation';
import { loadQuiz, toPublicQuiz } from '@/lib/quiz/loadQuiz';
import { QuizRunner } from '@/components/quiz/QuizRunner';

export default async function QuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;

  const quiz = loadQuiz(quizId);
  if (!quiz) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{quiz.title}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{quiz.description}</p>
      </div>

      <QuizRunner quiz={toPublicQuiz(quiz)} />
    </div>
  );
}
