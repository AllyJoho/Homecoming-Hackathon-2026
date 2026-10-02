'use client';

// @/components/quiz/questions/ShortAnswer.tsx
// [stretch] Free text, compared case-insensitively against `acceptedAnswers`.
// Keep these to one word or a short phrase — the grader is an exact match, not
// a judgment call.

import type { QuestionProps } from './index';

export function ShortAnswer({ question, answer, onChange, disabled }: QuestionProps<'short_answer'>) {
  return (
    <div>
      <label htmlFor={question.id} className="sr-only">
        {question.prompt}
      </label>
      <input
        id={question.id}
        type="text"
        autoComplete="off"
        disabled={disabled}
        value={answer?.text ?? ''}
        onChange={(event) => onChange({ type: 'short_answer', text: event.target.value })}
        placeholder="Type your answer"
        className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-900 disabled:opacity-50 dark:border-surface-border dark:bg-surface dark:focus:border-zinc-50"
      />
    </div>
  );
}
