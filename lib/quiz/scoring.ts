// @/lib/quiz/scoring.ts
// Turns per-question grades into a score and a pass/fail. Separate from
// grading.ts because the pass rule is a product decision that will get argued
// about, and it should be changeable in one place.

import type { AnswerSheet, Quiz, QuizResult } from '@/types/quiz';
import { gradeQuestion } from './grading';

/** Used when a quiz JSON omits `passingScore`. */
export const DEFAULT_PASSING_SCORE = 70;

/**
 * Grade a whole submission. The submit route calls this with the quiz loaded
 * server-side, never with a quiz sent up by the client.
 */
export function scoreQuiz(quiz: Quiz, answers: AnswerSheet): QuizResult {
  const graded = quiz.questions.map((q) => gradeQuestion(q, answers[q.id]));

  const pointsEarned = graded.reduce((sum, g) => sum + g.pointsEarned, 0);
  const pointsPossible = graded.reduce((sum, g) => sum + g.pointsPossible, 0);

  // Guard against a quiz with no questions rather than returning NaN.
  const score = pointsPossible === 0 ? 0 : Math.round((pointsEarned / pointsPossible) * 100);
  const threshold = quiz.passingScore ?? DEFAULT_PASSING_SCORE;

  return {
    quizId: quiz.id,
    score,
    passed: score >= threshold,
    pointsEarned,
    pointsPossible,
    graded,
  };
}
