'use client';

// @/components/quiz/questions/TrueFalse.tsx
// [stretch] A two-option multiple choice, but typed as a boolean so grading
// doesn't depend on option ids.

import type { QuestionProps } from './index';

export function TrueFalse({ question, answer, onChange, disabled }: QuestionProps<'true_false'>) {
  return (
    <fieldset className="flex gap-2" disabled={disabled}>
      <legend className="sr-only">{question.prompt}</legend>
      {[true, false].map((value) => (
        <label
          key={String(value)}
          className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm hover:bg-zinc-50 has-checked:border-zinc-900 dark:border-surface-border dark:bg-surface dark:hover:bg-surface-raised dark:has-checked:border-zinc-50"
        >
          <input
            type="radio"
            name={question.id}
            checked={answer?.value === value}
            onChange={() => onChange({ type: 'true_false', value })}
            className="accent-zinc-900 dark:accent-zinc-50"
          />
          <span>{value ? 'True' : 'False'}</span>
        </label>
      ))}
    </fieldset>
  );
}
