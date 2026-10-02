// @/app/api/results/[resultId]/feedback/route.ts
// AI coaching on ONE question of a finished attempt, as a conversation. Called
// by the coach under each question on the results screen
// (components/quiz/QuestionCoach).
//
// This replaced a whole-quiz version that explained every missed question in a
// single card. Two things were wrong with that. A student reading the review
// list had to match explanations back to questions by eye, and they couldn't
// ask about any of it — the one thing a tutor is for. So the unit is now one
// question, and the response is one turn of a thread the student can continue.
//
// The shape that moved with it: the old route asked for structured fields,
// because prose came back as markdown and rendered as literal asterisks. A
// conversation can't be structured that way, so the markdown ban went back
// into the prompt and the coach renders backticks as inline code — the one
// mark the model reaches for on a coding quiz. See @/lib/ai/prompts.
//
// The client holds the transcript and resends it each turn; @/lib/quiz/
// coachTurns says why, and what it does and doesn't let a client do. The part
// that stays here: the question, its answer key, and what the student actually
// answered are read out of the database every turn, and the opening message is
// written by this route. The client can't restate any of them.

import { NextResponse } from 'next/server';

import type { AnswerSheet } from '@/types/quiz';
import { z } from 'zod';

import { AiError, aiUnavailableReason, generateChat } from '@/lib/ai/provider';
import type { AiMessage } from '@/lib/ai/provider';
import { QUESTION_COACH_SYSTEM_PROMPT, buildQuestionCoachOpening } from '@/lib/ai/prompts';
import { getSessionUser, unauthorized } from '@/lib/auth/session';
import { getAttempt, loadQuiz } from '@/prisma/queries';
import { coachTurnsSchema } from '@/lib/quiz/coachTurns';
import {
  describeAnswerKey,
  describeCode,
  describeOptions,
  describeStudentAnswer,
} from '@/lib/quiz/describe';
import { scoreQuiz } from '@/lib/quiz/scoring';

const BodySchema = z.object({
  questionId: z.string().min(1),
  /** Empty on the first ask — see @/lib/quiz/coachTurns for the shape. */
  turns: coachTurnsSchema.default([]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ resultId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { resultId } = await params;

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Malformed coaching request.' }, { status: 400 });
  }
  const { questionId, turns } = parsed.data;

  // Checked against the task's own provider, not the global default — this
  // task has an AI_PROVIDER_QUIZ_COACHING override in .env.
  const unavailable = aiUnavailableReason('quiz-coaching');
  if (unavailable) return NextResponse.json({ error: unavailable }, { status: 503 });

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

  const index = quiz.questions.findIndex((q) => q.id === questionId);
  if (index === -1) {
    return NextResponse.json({ error: 'That question is not in this quiz.' }, { status: 404 });
  }
  const question = quiz.questions[index];

  // Re-graded rather than read from a stored grade, for the same reason the
  // results page re-grades: `answers` is the only thing persisted.
  const answers = attempt.answers as unknown as AnswerSheet;
  const result = scoreQuiz(quiz, answers);
  const graded = result.graded.find((g) => g.questionId === questionId);

  const opening = buildQuestionCoachOpening({
    quizTitle: quiz.title,
    questionNumber: index + 1,
    questionCount: quiz.questions.length,
    correct: graded?.correct ?? false,
    prompt: question.prompt,
    code: describeCode(question),
    options: describeOptions(question),
    answerKey: describeAnswerKey(question),
    studentAnswer: describeStudentAnswer(question, answers[questionId]),
    authorNote: question.explanation,
  });

  // The opening turn is prepended on every request, not carried by the client,
  // so the answer key the model sees always comes from the database.
  const messages: AiMessage[] = [{ role: 'user', content: opening }, ...turns];

  try {
    const reply = await generateChat({
      task: 'quiz-coaching',
      system: QUESTION_COACH_SYSTEM_PROMPT,
      messages,
    });

    if (!reply.trim()) {
      return NextResponse.json(
        { error: 'The model returned an empty answer. Try again.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply: reply.trim() });
  } catch (error) {
    // AiError messages are already written for the student to read.
    if (error instanceof AiError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
