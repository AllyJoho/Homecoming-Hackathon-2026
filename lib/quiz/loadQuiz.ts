// @/lib/quiz/loadQuiz.ts
// Reads quizzes out of data/quizzes/.
//
// These are static `import`s rather than fs.readFile so the JSON is bundled and
// type-checked at build time — no runtime path resolution, works the same in
// `next dev` and in a standalone production build. The cost is that adding a
// quiz means adding a line to QUIZ_MODULES. That tradeoff is worth it for a
// handful of quizzes; if the set ever gets large, swap this for a filesystem
// read behind the same two exported functions and nothing else changes.

import type { PublicQuestion, PublicQuiz, Quiz } from '@/types/quiz';

import javascriptQuiz from '@/data/quizzes/javascript.json';
import sqlQuiz from '@/data/quizzes/sql.json';

// `as Quiz` is the one unchecked cast in the quiz path: TypeScript widens JSON
// string fields to `string`, which won't satisfy the literal union on
// `Question['type']`. If a quiz JSON drifts from the schema, it surfaces here —
// consider a zod parse in this function if authoring errors become common.
const QUIZ_MODULES: Record<string, Quiz> = {
  javascript: javascriptQuiz as Quiz,
  sql: sqlQuiz as Quiz,
};

/** Every quiz, for the selection screen. */
export function listQuizzes(): Quiz[] {
  return Object.values(QUIZ_MODULES);
}

/** One quiz by id (the JSON file stem), or null for the 404 path. */
export function loadQuiz(quizId: string): Quiz | null {
  return QUIZ_MODULES[quizId] ?? null;
}

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
