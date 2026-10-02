// @/app/(main)/quizzes/[quizId]/results/page.tsx
// Score, pass/fail, and what the certificate (if any) was.
//
// The attempt id arrives as ?attempt=… and the result is re-graded from the
// stored answer sheet rather than passed through the URL. That's why
// QuizAttempt keeps `answers` as JSON: this page, and the [stretch] AI
// feedback route, both rebuild the grading from it.

import { notFound } from 'next/navigation';
import type { AnswerSheet } from '@/types/quiz';
import { requireSessionUser } from '@/lib/auth/session';
import { getAttempt } from '@/lib/db/queries';
import { loadQuiz, toPublicQuiz } from '@/lib/quiz/loadQuiz';
import { scoreQuiz } from '@/lib/quiz/scoring';
import { ResultSummary } from '@/components/quiz/ResultSummary';

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ quizId: string }>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const user = await requireSessionUser();
  const [{ quizId }, { attempt: attemptId }] = await Promise.all([params, searchParams]);

  if (!attemptId) notFound();

  const quiz = loadQuiz(quizId);
  const attempt = await getAttempt(attemptId);

  // 404 on someone else's attempt as well as on a missing one — don't confirm
  // that an id exists.
  if (!quiz || !attempt || attempt.userId !== user.id || attempt.quizId !== quizId) {
    notFound();
  }

  const result = scoreQuiz(quiz, attempt.answers as unknown as AnswerSheet);

  return (
    <ResultSummary
      quiz={toPublicQuiz(quiz)}
      result={result}
      certificateSlug={attempt.certification?.shareSlug ?? null}
    />
  );
}
