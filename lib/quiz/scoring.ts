// @/lib/quiz/scoring.ts
// Turns per-question grades into a score and the certificate level it earns
// (or none). Separate from grading.ts because the level bands are a product
// decision — they live in ./levels so they're changeable in one place.

import type { AnswerSheet, Quiz, QuizResult } from '@/types/quiz';
import { gradeQuestion } from './grading';
import { levelFor } from './levels';

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

  return {
    quizId: quiz.id,
    score,
    level: levelFor(pointsEarned, pointsPossible),
    pointsEarned,
    pointsPossible,
    graded,
  };
}
