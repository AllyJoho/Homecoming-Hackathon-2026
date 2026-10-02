'use client';

// @/components/quiz/QuestionRenderer.tsx
// Picks the component for a question by its `type` and hands it the matching
// answer. The prompt is rendered here, once, so each question component only
// has to render its input.

import type { ComponentType } from 'react';
import type { Answer, PublicQuestion } from '@/types/quiz';
import { QUESTION_COMPONENTS, type AnyQuestionProps } from './questions';

export interface QuestionRendererProps {
  question: PublicQuestion;
  answer: Answer | undefined;
  onChange: (answer: Answer) => void;
  disabled?: boolean;
  /** 1-based, for the "Question 3 of 6" line. */
  index?: number;
  total?: number;
}

export function QuestionRenderer({
  question,
  answer,
  onChange,
  disabled,
  index,
  total,
}: QuestionRendererProps) {
  // The one cast in this path. `question.type` is the key we look up, so the
  // component and the question are the same variant by construction — but
  // TypeScript can't see that the indexed access and the narrowing agree.
  const Component = QUESTION_COMPONENTS[question.type] as ComponentType<AnyQuestionProps>;

  return (
    <div className="flex flex-col gap-4">
      {index !== undefined && total !== undefined && (
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Question {index} of {total}
        </p>
      )}
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">{question.prompt}</h2>
      <Component question={question} answer={answer} onChange={onChange} disabled={disabled} />
    </div>
  );
}
