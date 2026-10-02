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
  'bugLines',
  'explanation',
] as const;

export function toPublicQuiz(quiz: Quiz): PublicQuiz {
  return {
    ...quiz,
    questions: quiz.questions.map((question) => {
      const copy: Record<string, unknown> = { ...question };
      for (const k of ANSWER_KEYS) delete copy[k];
      // order_lines can't drop its answer key — the student needs the lines —
      // so it hides it by shuffling instead.
      if (question.type === 'order_lines') copy.lines = shuffleLines(question.id, question.lines);
      return copy as PublicQuestion;
    }),
  };
}

/**
 * A shuffle seeded by the question id, so it's the same on every page load
 * (a refresh mid-quiz doesn't scramble the list again) and this module stays
 * pure. Never returns the original order — a question that starts out solved
 * isn't a question.
 */
function shuffleLines<T>(questionId: string, lines: T[]): T[] {
  if (lines.length < 2) return lines;

  // FNV-1a hash of the id → seed for a small LCG. Not cryptographic, and
  // doesn't need to be: the goal is "not in the authored order", not secrecy.
  let seed = 2166136261;
  for (let i = 0; i < questionId.length; i++) {
    seed = Math.imul(seed ^ questionId.charCodeAt(i), 16777619) >>> 0;
  }
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };

  const shuffled = [...lines];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Rotating by one is guaranteed to differ from the original.
  if (shuffled.every((line, i) => line === lines[i])) shuffled.push(shuffled.shift()!);
  return shuffled;
}
