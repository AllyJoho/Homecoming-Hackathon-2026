'use client';

// @/components/quiz/questions/MultipleChoice.tsx
// One correct option. Radio semantics, so arrow keys work for free.

import type { QuestionProps } from './index';

export function MultipleChoice({
  question,
  answer,
  onChange,
  disabled,
}: QuestionProps<'multiple_choice'>) {
  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="sr-only">{question.prompt}</legend>
      {question.options.map((option) => (
        <label
          key={option.id}
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 text-sm hover:bg-zinc-50 has-checked:border-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-900 dark:has-checked:border-zinc-50"
        >
          <input
            type="radio"
            name={question.id}
            value={option.id}
            checked={answer?.optionId === option.id}
            onChange={() => onChange({ type: 'multiple_choice', optionId: option.id })}
            className="accent-zinc-900 dark:accent-zinc-50"
          />
          <span>{option.text}</span>
        </label>
      ))}
    </fieldset>
  );
}
