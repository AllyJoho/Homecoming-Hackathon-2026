// @/components/quiz/questions/index.ts
// The question-type → component registry, and the props contract every
// question component shares.
//
// Registering a component here is one step of adding a question type — the
// full checklist is in the README under Quiz Formats. `satisfies` below makes
// the registry fail to compile if a type has no component.

import type { ComponentType } from 'react';
import type { Answer, PublicQuestion, QuestionType } from '@/types/quiz';

import { FindTheBug } from './FindTheBug';
import { MultiSelect } from './MultiSelect';
import { MultipleChoice } from './MultipleChoice';
import { OrderLines } from './OrderLines';
import { ShortAnswer } from './ShortAnswer';
import { TrueFalse } from './TrueFalse';

/** The question variant for one type, with its answer fields already stripped. */
export type PublicQuestionOf<T extends QuestionType> = Extract<PublicQuestion, { type: T }>;

/** The answer variant that pairs with one question type. */
export type AnswerOf<T extends QuestionType> = Extract<Answer, { type: T }>;

export interface QuestionProps<T extends QuestionType> {
  question: PublicQuestionOf<T>;
  /** Undefined until the student touches the question. */
  answer: AnswerOf<T> | undefined;
  onChange: (answer: AnswerOf<T>) => void;
  /** True while the submission is in flight. */
  disabled?: boolean;
}

export const QUESTION_COMPONENTS = {
  multiple_choice: MultipleChoice,
  multi_select: MultiSelect,
  true_false: TrueFalse,
  short_answer: ShortAnswer,
  find_the_bug: FindTheBug,
  order_lines: OrderLines,
} satisfies { [T in QuestionType]: ComponentType<QuestionProps<T>> };

/** Props shape after the registry lookup collapses the per-type generics. */
export type AnyQuestionProps = {
  question: PublicQuestion;
  answer: Answer | undefined;
  onChange: (answer: Answer) => void;
  disabled?: boolean;
};
