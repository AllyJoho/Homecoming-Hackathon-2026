'use client';

// @/components/quiz/questions/MultiSelect.tsx
// [stretch] Any number of correct options. Graded all-or-nothing — see the
// `multi_select` case in @/lib/quiz/grading.

import type { QuestionProps } from './index';

export function MultiSelect({
  question,
  answer,
  onChange,
  disabled,
}: QuestionProps<'multi_select'>) {
  const selected = answer?.optionIds ?? [];

  function toggle(optionId: string) {
    const next = selected.includes(optionId)
      ? selected.filter((id) => id !== optionId)
      : [...selected, optionId];
    onChange({ type: 'multi_select', optionIds: next });
  }

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
        Select all that apply
      </legend>
      {question.options.map((option) => (
        <label
          key={option.id}
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm hover:bg-zinc-50 has-checked:border-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900 dark:has-checked:border-zinc-50"
        >
          <input
            type="checkbox"
            name={`${question.id}-${option.id}`}
            checked={selected.includes(option.id)}
            onChange={() => toggle(option.id)}
            className="accent-zinc-900 dark:accent-zinc-50"
          />
          <span>{option.text}</span>
        </label>
      ))}
    </fieldset>
  );
}
