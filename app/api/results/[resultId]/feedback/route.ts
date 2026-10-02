// @/app/api/results/[resultId]/feedback/route.ts
// [stretch] Per-question AI coaching on a finished attempt.
//
// Reads the stored answer sheet back, re-grades it, and asks Claude to explain
// only what the student got wrong. Non-streaming: the output is a few
// paragraphs. If it grows, switch to `anthropic.messages.stream()` and return
// `stream.toReadableStream()` so the page can render as it arrives.

import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

import type { AnswerSheet } from '@/types/quiz';
import { MODEL, aiEnabled, anthropic } from '@/lib/ai/client';
import { FEEDBACK_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { getSessionUser, unauthorized } from '@/lib/auth/session';
import { getAttempt } from '@/prisma/queries';
import { loadQuiz } from '@/lib/quiz/loadQuiz';
import { scoreQuiz } from '@/lib/quiz/scoring';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ resultId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { resultId } = await params;

  if (!aiEnabled) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set.' }, { status: 503 });
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

  const quiz = loadQuiz(attempt.quizId);
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
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: FEEDBACK_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Quiz: ${quiz.title}\nScore: ${result.score}%\n\nMissed questions (with the answer key and what the student chose):\n${JSON.stringify(review, null, 2)}`,
        },
      ],
    });

    // content is a discriminated union — narrow before reading .text.
    const feedback = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n\n');

    return NextResponse.json({ feedback });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API error ${error.status}: ${error.message}` },
        { status: 502 },
      );
    }
    throw error;
  }
}
