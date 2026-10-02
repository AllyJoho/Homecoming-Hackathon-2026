// @/types/quiz.ts
// The quiz content model. Quizzes are authored as JSON in data/quizzes/,
// seeded into Postgres by prisma/seed.ts, and rebuilt into these types by the
// loaders in @/prisma/queries.
//
// `Question` is a discriminated union on `type`. That one decision drives three
// other files: QuestionRenderer picks a component by it, grading.ts picks a
// grader by it, and the registry in components/quiz/questions/index.ts is the
// map between them. The full add-a-type checklist (it also reaches the
// database and the answer-key stripper) is in the README under Quiz Formats.

import type { ProficiencyLevel } from '@/lib/quiz/levels';

export type QuestionType =
  | 'multiple_choice'
  | 'multi_select'
  | 'true_false'
  | 'short_answer'
  | 'find_the_bug'
  | 'order_lines';

export interface QuizOption {
  id: string;
  text: string;
}

/**
 * A snippet shown under the prompt. Any question type can carry one, which is
 * what turns a plain multiple-choice question into "predict the output".
 * Public on purpose — it's part of the question, not the answer key.
 */
export interface QuestionCode {
  /** A Prism language id: "javascript", "sql", "python", "typescript", … */
  language: string;
  source: string;
}

interface QuestionBase {
  id: string;
  prompt: string;
  code?: QuestionCode;
  /** Defaults to 1 when the JSON omits it. */
  points?: number;
  /** Shown on the results screen after grading. */
  explanation?: string;
}

export interface MultipleChoiceQuestion extends QuestionBase {
  type: 'multiple_choice';
  options: QuizOption[];
  correctOptionId: string;
}

export interface MultiSelectQuestion extends QuestionBase {
  type: 'multi_select';
  options: QuizOption[];
  /** All of these and none other — partial credit is not awarded. */
  correctOptionIds: string[];
}

export interface TrueFalseQuestion extends QuestionBase {
  type: 'true_false';
  correctAnswer: boolean;
}

export interface ShortAnswerQuestion extends QuestionBase {
  type: 'short_answer';
  /** Compared case-insensitively, whitespace-trimmed. Any one match passes. */
  acceptedAnswers: string[];
}

export interface FindTheBugQuestion extends QuestionBase {
  type: 'find_the_bug';
  /** Required here, unlike the other types — the snippet IS the question. */
  code: QuestionCode;
  /** 1-based line numbers. Exact set match, no partial credit. */
  bugLines: number[];
}

export interface OrderLinesQuestion extends QuestionBase {
  type: 'order_lines';
  /**
   * Authored in the CORRECT order — the array order is the answer key.
   * toPublicQuiz shuffles it before it reaches the browser.
   */
  lines: QuizOption[];
}

export type Question =
  | MultipleChoiceQuestion
  | MultiSelectQuestion
  | TrueFalseQuestion
  | ShortAnswerQuestion
  | FindTheBugQuestion
  | OrderLinesQuestion;

export interface Quiz {
  /** Matches the JSON file stem, and is what the DB stores as `quizId`. */
  id: string;
  title: string;
  /** Canonical skill slug this quiz certifies — see @/lib/profile/skills. */
  skillSlug: string;
  description: string;
  /** Optional countdown for the runner. Not enforced server-side. */
  timeLimitSeconds?: number;
  questions: Question[];
}

// ── Answers ──────────────────────────────────────────────────────────────────
// The shapes the runner collects and POSTs. `null` / `[]` / `''` mean
// "unanswered", which grades as incorrect rather than erroring.

export type Answer =
  | { type: 'multiple_choice'; optionId: string | null }
  | { type: 'multi_select'; optionIds: string[] }
  | { type: 'true_false'; value: boolean | null }
  | { type: 'short_answer'; text: string }
  | { type: 'find_the_bug'; lines: number[] }
  | { type: 'order_lines'; lineIds: string[] };

/** The answer variant that goes with a given question variant. */
export type AnswerFor<Q extends Question> = Extract<Answer, { type: Q['type'] }>;

/** Keyed by question id. This is what the submit route receives. */
export type AnswerSheet = Record<string, Answer>;

// ── Results ──────────────────────────────────────────────────────────────────

export interface GradedQuestion {
  questionId: string;
  correct: boolean;
  pointsEarned: number;
  pointsPossible: number;
  explanation?: string;
  /**
   * What the student put down, in words — option text rather than ids, so the
   * review screen can show it as-is. Built by `describeStudentAnswer`, and
   * reads "(left blank)" for a skipped question.
   */
  yourAnswer: string;
}

export interface QuizResult {
  quizId: string;
  /** Rounded percentage, 0–100. */
  score: number;
  /** The level this score earns — there is no pass/fail. */
  level: ProficiencyLevel;
  pointsEarned: number;
  pointsPossible: number;
  graded: GradedQuestion[];
}

// ── The client-safe view ─────────────────────────────────────────────────────
// What the quiz runner is allowed to render. Stripping the answer fields means
// the answer key is never in the page payload — grading is server-side only.
// `Q extends unknown ?` makes the Omit distribute over the union, so each
// variant keeps its own literal `type` and its `options`.

type StripAnswers<Q> = Q extends unknown
  ? Omit<
      Q,
      | 'correctOptionId'
      | 'correctOptionIds'
      | 'correctAnswer'
      | 'acceptedAnswers'
      | 'bugLines'
      | 'explanation'
    >
  : never;

export type PublicQuestion = StripAnswers<Question>;

export type PublicQuiz = Omit<Quiz, 'questions'> & { questions: PublicQuestion[] };
