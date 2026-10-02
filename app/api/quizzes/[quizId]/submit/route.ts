// @/app/api/quizzes/[quizId]/submit/route.ts
// Grades a submission and awards the certificate.
//
// This route is the trust boundary of the whole quiz feature: the quiz (with
// its answer key) is loaded here, server-side, and the client only ever sends
// an answer sheet. Nothing the browser posts can change the score.

import { NextResponse } from 'next/server';
import type { AnswerSheet } from '@/types/quiz';
import { getSessionUser, unauthorized } from '@/lib/auth/session';
import { recordAttempt } from '@/lib/db/queries';
import { loadQuiz } from '@/lib/quiz/loadQuiz';
import { scoreQuiz } from '@/lib/quiz/scoring';

export async function POST(request: Request, { params }: { params: Promise<{ quizId: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { quizId } = await params;

  const quiz = loadQuiz(quizId);
  if (!quiz) {
    return NextResponse.json({ error: `No quiz named "${quizId}".` }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { answers?: AnswerSheet } | null;
  const answers = body?.answers;
  if (!answers || typeof answers !== 'object') {
    return NextResponse.json({ error: 'An answers object is required.' }, { status: 400 });
  }

  const result = scoreQuiz(quiz, answers);

  // One transaction: the attempt, the certificate (if passed), and the
  // QUIZ-sourced skill credit.
  const { attempt, certification } = await recordAttempt({
    userId: user.id,
    quiz,
    result,
    answers,
  });

  return NextResponse.json({
    attemptId: attempt.id,
    score: result.score,
    passed: result.passed,
    certificateSlug: certification?.shareSlug ?? null,
  });
}
