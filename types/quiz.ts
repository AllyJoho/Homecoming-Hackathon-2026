// @/types/quiz.ts
// The quiz content model. Quizzes are authored as JSON in data/quizzes/,
// seeded into Postgres by prisma/seed.ts, and rebuilt into these types by the
// loaders in @/prisma/queries.
//
// `Question` is a discriminated union on `type`. That one decision drives three
// other files: QuestionRenderer picks a component by it, grading.ts picks a
// grader by it, and the registry in components/quiz/questions/index.ts is the
// map between them. Adding a question type means touching exactly those three.

import type { ProficiencyLevel } from '@/lib/quiz/levels';

export type QuestionType =
  | 'multiple_choice'
  | 'multi_select'
  | 'true_false'
  | 'short_answer';

export interface QuizOption {
  id: string;
  text: string;
}

interface QuestionBase {
  id: string;
  prompt: string;
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

export type Question =
  | MultipleChoiceQuestion
  | MultiSelectQuestion
  | TrueFalseQuestion
  | ShortAnswerQuestion;

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
  | { type: 'short_answer'; text: string };

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
      'correctOptionId' | 'correctOptionIds' | 'correctAnswer' | 'acceptedAnswers' | 'explanation'
    >
  : never;

export type PublicQuestion = StripAnswers<Question>;

export type PublicQuiz = Omit<Quiz, 'questions'> & { questions: PublicQuestion[] };
