// @/lib/quiz/publicQuiz.ts
// Strips the answer key off a quiz before it reaches the browser. Pure, and
// deliberately separate from the loader in prisma/queries.ts: the point is
// that no code path can hand a client component a quiz that still has its
// answers attached.

import type { PublicQuestion, PublicQuiz, Quiz } from '@/types/quiz';

/**
 * The quiz without its answers — what a client component is allowed to see.
 * The runner never receives `correctOptionId` / `acceptedAnswers`, so the
 * answer key can't be read out of the page source.
 */
const ANSWER_KEYS = [
  'correctOptionId',
  'correctOptionIds',
  'correctAnswer',
  'acceptedAnswers',
  'explanation',
] as const;

export function toPublicQuiz(quiz: Quiz): PublicQuiz {
  return {
    ...quiz,
    questions: quiz.questions.map((question) => {
      const copy: Record<string, unknown> = { ...question };
      for (const k of ANSWER_KEYS) delete copy[k];
      return copy as PublicQuestion;
    }),
  };
}
