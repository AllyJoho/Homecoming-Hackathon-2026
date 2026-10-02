'use client';

// @/components/quiz/questions/FindTheBug.tsx
// Click the line(s) with the bug. Graded as an exact set — see the
// `find_the_bug` case in @/lib/quiz/grading.

import { CodeBlock } from '../CodeBlock';
import type { QuestionProps } from './index';

export function FindTheBug({ question, answer, onChange, disabled }: QuestionProps<'find_the_bug'>) {
  const selected = answer?.lines ?? [];

  function toggle(lineNumber: number) {
    const next = selected.includes(lineNumber)
      ? selected.filter((n) => n !== lineNumber)
      : [...selected, lineNumber].sort((a, b) => a - b);
    onChange({ type: 'find_the_bug', lines: next });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Click the line(s) with the bug. Click again to unselect.
      </p>
      <CodeBlock
        code={question.code}
        selectedLines={selected}
        onToggleLine={toggle}
        disabled={disabled}
      />
      <p className="text-xs text-zinc-500 dark:text-zinc-400" aria-live="polite">
        {selected.length === 0
          ? 'No lines selected.'
          : `Selected: line${selected.length === 1 ? '' : 's'} ${selected.join(', ')}`}
      </p>
    </div>
  );
}
