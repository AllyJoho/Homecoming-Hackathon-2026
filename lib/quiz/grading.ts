// @/lib/quiz/grading.ts
// One grader per question type. Pure functions — no DB, no fetch — so they're
// trivially unit-testable and safe to re-run on a stored answer sheet.
//
// Adding a question type: add the case here, and the switch stops compiling
// anywhere else it's missing (see the `never` exhaustiveness check).

import type { Answer, GradedQuestion, Question } from '@/types/quiz';
import { describeStudentAnswer } from './describe';

/** Case-insensitive, whitespace-collapsed compare for short answers. */
function loose(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function sameSet<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  const bSet = new Set(b);
  return a.every((id) => bSet.has(id));
}

/**
 * Grade one question. `answer` may be undefined (question skipped) — that
 * grades as incorrect rather than throwing, so a partial submission still
 * produces a score.
 */
export function gradeQuestion(question: Question, answer: Answer | undefined): GradedQuestion {
  const pointsPossible = question.points ?? 1;
  const correct = isCorrect(question, answer);

  return {
    questionId: question.id,
    correct,
    pointsEarned: correct ? pointsPossible : 0,
    pointsPossible,
    explanation: question.explanation,
    yourAnswer: describeStudentAnswer(question, answer),
  };
}

function isCorrect(question: Question, answer: Answer | undefined): boolean {
  if (!answer || answer.type !== question.type) return false;

  switch (question.type) {
    case 'multiple_choice':
      // Narrowing `answer` by the question type is what the `AnswerFor<Q>`
      // pairing in types/quiz.ts buys us.
      return answer.type === 'multiple_choice' && answer.optionId === question.correctOptionId;

    case 'multi_select':
      // All-or-nothing: no partial credit. If you want partial credit, this is
      // the one place to change it (and gradeQuestion's pointsEarned above).
      return answer.type === 'multi_select' && sameSet(answer.optionIds, question.correctOptionIds);

    case 'true_false':
      return answer.type === 'true_false' && answer.value === question.correctAnswer;

    case 'short_answer':
      return (
        answer.type === 'short_answer' &&
        question.acceptedAnswers.some((accepted) => loose(accepted) === loose(answer.text))
      );

    case 'find_the_bug':
      // Exact set of lines, same all-or-nothing rule as multi_select. Click
      // order doesn't matter, so it's a set compare, not an array compare.
      return answer.type === 'find_the_bug' && sameSet(answer.lines, question.bugLines);

    case 'order_lines': {
      // The authored order of `lines` is the answer key. Compared by text, not
      // id: two identical lines (say, two closing `}`) are interchangeable, and
      // swapping them shouldn't cost the student the question.
      if (answer.type !== 'order_lines' || answer.lineIds.length !== question.lines.length) {
        return false;
      }
      const textById = new Map(question.lines.map((line) => [line.id, line.text]));
      return question.lines.every((line, i) => textById.get(answer.lineIds[i]) === line.text);
    }

    default: {
      // Exhaustiveness guard: a new question type fails to compile here.
      const _exhaustive: never = question;
      return _exhaustive;
    }
  }
}
