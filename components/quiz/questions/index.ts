// @/components/quiz/questions/index.ts
// The question-type → component registry, and the props contract every
// question component shares.
//
// This file plus @/lib/quiz/grading are the two places a new question type
// touches: add the variant to `Question` in @/types/quiz, add a grader, add a
// component here. `satisfies` below makes the registry fail to compile if a
// type has no component.

import type { ComponentType } from 'react';
import type { Answer, PublicQuestion, QuestionType } from '@/types/quiz';

import { MultiSelect } from './MultiSelect';
import { MultipleChoice } from './MultipleChoice';
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
} satisfies { [T in QuestionType]: ComponentType<QuestionProps<T>> };

/** Props shape after the registry lookup collapses the per-type generics. */
export type AnyQuestionProps = {
  question: PublicQuestion;
  answer: Answer | undefined;
  onChange: (answer: Answer) => void;
  disabled?: boolean;
};
