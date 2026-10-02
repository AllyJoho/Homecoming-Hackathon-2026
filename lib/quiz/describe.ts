// @/lib/quiz/describe.ts
// Renders a question, its answer key, and what the student put down as plain
// readable lines — the material the per-question coach needs in its prompt.
//
// Server-only in practice: `describeAnswerKey` reads the fields `toPublicQuiz`
// strips, so calling it from a client component would be a leak. Nothing
// enforces that; the only caller is the feedback route.
//
// Prose rather than `JSON.stringify(question)`, which is what the old
// whole-quiz coaching prompt sent. Two reasons it's worth the code: a model
// asked to explain "you picked `b`, the answer was `d`" has to resolve the ids
// itself before it can say anything useful, and the ids are noise either way —
// writing the option text out is both cheaper and harder to get wrong.
//
// Adding a question type: the switches here stop compiling (see the `never`
// guards), same as grading.ts.

import type { Answer, Question, QuizOption } from '@/types/quiz';

/** What an unanswered question reads as. Blank grades as incorrect. */
const BLANK = '(left blank)';

/**
 * The text behind an option id.
 *
 * Falls back to naming the id rather than throwing: a quiz edited after an
 * attempt was stored can leave an answer pointing at an option that no longer
 * exists, and a coaching request is not the place to 500 over it.
 */
function textFor(options: QuizOption[], id: string): string {
  return options.find((option) => option.id === id)?.text ?? `(option ${id}, no longer in the quiz)`;
}

function numbered(lines: string[]): string {
  return lines.map((line, i) => `${i + 1}. ${line}`).join('\n');
}

function lineList(lineNumbers: number[]): string {
  if (lineNumbers.length === 0) return '(no lines)';
  const sorted = [...lineNumbers].sort((a, b) => a - b);
  return `line${sorted.length === 1 ? '' : 's'} ${sorted.join(', ')}`;
}

/** The correct answer, in words. Reads the answer key — server-side only. */
export function describeAnswerKey(question: Question): string {
  switch (question.type) {
    case 'multiple_choice':
      return textFor(question.options, question.correctOptionId);

    case 'multi_select':
      // " + " rather than a comma: the option text may itself contain commas,
      // and multi_select is all-or-nothing, so the set is the answer.
      return question.correctOptionIds.map((id) => textFor(question.options, id)).join(' + ');

    case 'true_false':
      return question.correctAnswer ? 'True' : 'False';

    case 'short_answer':
      return question.acceptedAnswers.map((accepted) => `"${accepted}"`).join(' or ');

    case 'find_the_bug':
      return lineList(question.bugLines);

    case 'order_lines':
      // The authored order IS the key — see types/quiz.ts.
      return `\n${numbered(question.lines.map((line) => line.text))}`;

    default: {
      const _exhaustive: never = question;
      return _exhaustive;
    }
  }
}

/**
 * What the student put down, in words.
 *
 * `answer` may be undefined (skipped) or — for a quiz edited since the attempt
 * — of a type that no longer matches the question. Both read as blank, which
 * is exactly how `gradeQuestion` scored them.
 */
export function describeStudentAnswer(question: Question, answer: Answer | undefined): string {
  if (!answer || answer.type !== question.type) return BLANK;

  switch (question.type) {
    case 'multiple_choice':
      // The `answer.type ===` halves are redundant after the guard above, but
      // they're what narrows the union for TypeScript — same pattern as
      // grading.ts's isCorrect.
      return answer.type === 'multiple_choice' && answer.optionId
        ? textFor(question.options, answer.optionId)
        : BLANK;

    case 'multi_select':
      return answer.type === 'multi_select' && answer.optionIds.length > 0
        ? answer.optionIds.map((id) => textFor(question.options, id)).join(' + ')
        : BLANK;

    case 'true_false':
      if (answer.type !== 'true_false' || answer.value === null) return BLANK;
      return answer.value ? 'True' : 'False';

    case 'short_answer':
      return answer.type === 'short_answer' && answer.text.trim()
        ? `"${answer.text.trim()}"`
        : BLANK;

    case 'find_the_bug':
      return answer.type === 'find_the_bug' && answer.lines.length > 0
        ? lineList(answer.lines)
        : BLANK;

    case 'order_lines': {
      if (answer.type !== 'order_lines' || answer.lineIds.length === 0) return BLANK;
      return `\n${numbered(answer.lineIds.map((id) => textFor(question.lines, id)))}`;
    }

    default: {
      const _exhaustive: never = question;
      return _exhaustive;
    }
  }
}

/**
 * The choices the student was picking from, or null for the types that don't
 * offer any (short answer, true/false, find the bug).
 *
 * Worth including: the distractor they chose is usually the whole story, and a
 * tutor that can't see the other options can't say why theirs was tempting.
 */
export function describeOptions(question: Question): string | null {
  switch (question.type) {
    case 'multiple_choice':
    case 'multi_select':
      return question.options.map((option) => `- ${option.text}`).join('\n');

    case 'order_lines':
      // Shown unordered on purpose — the authored order is the answer key, and
      // describeAnswerKey already prints it under its own heading.
      return question.lines.map((line) => `- ${line.text}`).join('\n');

    case 'true_false':
    case 'short_answer':
    case 'find_the_bug':
      return null;

    default: {
      const _exhaustive: never = question;
      return _exhaustive;
    }
  }
}

/**
 * The snippet with 1-based line numbers down the side.
 *
 * Numbered because `find_the_bug` answers ARE line numbers, so an unnumbered
 * snippet would leave the model counting lines to work out what "line 4"
 * refers to. Harmless on the other types, which just get a tidy listing.
 */
export function describeCode(question: Question): string | null {
  if (!question.code) return null;
  const lines = question.code.source.split('\n');
  const width = String(lines.length).length;
  const body = lines
    .map((line, i) => `${String(i + 1).padStart(width, ' ')} | ${line}`)
    .join('\n');
  return `${question.code.language}\n${body}`;
}
