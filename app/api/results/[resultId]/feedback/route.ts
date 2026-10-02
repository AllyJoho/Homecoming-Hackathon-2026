// @/app/api/results/[resultId]/feedback/route.ts
// Per-question AI coaching on a finished attempt. Called by the Coaching card
// on the results screen (components/quiz/FeedbackPanel).
//
// Reads the stored answer sheet back, re-grades it, and asks the model to
// explain only what the student got wrong. Which model that is depends on
// AI_PROVIDER — see @/lib/ai/tasks under 'quiz-coaching'.
//
// Non-streaming: the output is a few paragraphs, and streaming it would mean
// implementing it once per backend.

import { NextResponse } from 'next/server';

import type { AnswerSheet } from '@/types/quiz';
import { AiError, aiReady, aiUnavailableReason, generateText } from '@/lib/ai/provider';
import { FEEDBACK_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { getSessionUser, unauthorized } from '@/lib/auth/session';
import { getAttempt, loadQuiz } from '@/prisma/queries';
import { scoreQuiz } from '@/lib/quiz/scoring';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ resultId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { resultId } = await params;

  if (!aiReady()) {
    return NextResponse.json({ error: aiUnavailableReason() }, { status: 503 });
  }

  const attempt = await getAttempt(resultId);
  // 404 rather than 403 for someone else's attempt — don't confirm it exists.
  if (!attempt || attempt.userId !== user.id) {
    return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 });
  }

  // quizId is null for an attempt generated from the Question bank rather than
  // an authored JSON quiz — there's no answer key to re-grade against.
  if (!attempt.quizId) {
    return NextResponse.json(
      { error: 'This attempt did not come from an authored quiz.' },
      { status: 409 },
    );
  }

  const quiz = await loadQuiz(attempt.quizId);
  if (!quiz) {
    return NextResponse.json({ error: 'The quiz for this attempt is gone.' }, { status: 410 });
  }

  const answers = attempt.answers as unknown as AnswerSheet;
  const result = scoreQuiz(quiz, answers);

  const missed = result.graded.filter((graded) => !graded.correct);
  if (missed.length === 0) {
    return NextResponse.json({ feedback: 'Perfect score — nothing to review.' });
  }

  // Only the missed questions go in the prompt: fewer tokens, and the model
  // can't wander into congratulating them on the ones they got right.
  const review = missed.map((graded) => {
    const question = quiz.questions.find((q) => q.id === graded.questionId);
    return {
      prompt: question?.prompt,
      question: question,
      studentAnswer: answers[graded.questionId] ?? null,
    };
  });

  try {
    const feedback = await generateText({
      task: 'quiz-coaching',
      system: FEEDBACK_SYSTEM_PROMPT,
      prompt: `Quiz: ${quiz.title}\nScore: ${result.score}%\n\nMissed questions (with the answer key and what the student chose):\n${JSON.stringify(review, null, 2)}`,
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    // AiError messages are already written for the student to read.
    if (error instanceof AiError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
