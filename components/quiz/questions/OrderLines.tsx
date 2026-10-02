'use client';

// @/components/quiz/questions/OrderLines.tsx
// Put shuffled lines back in order (a "Parsons problem"). Up/down buttons
// rather than drag-and-drop: no dependency, and it works from the keyboard.
//
// The lines arrive already shuffled by toPublicQuiz. Until the student moves
// something, there's no answer — an untouched list grades as blank.

import type { QuestionProps } from './index';

export function OrderLines({ question, answer, onChange, disabled }: QuestionProps<'order_lines'>) {
  const byId = new Map(question.lines.map((line) => [line.id, line]));
  const order = answer?.lineIds ?? question.lines.map((line) => line.id);

  function move(from: number, to: number) {
    const next = [...order];
    [next[from], next[to]] = [next[to], next[from]];
    onChange({ type: 'order_lines', lineIds: next });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Use the arrows to put the lines in the right order.
      </p>
      <ol className="flex flex-col gap-1.5">
        {order.map((id, i) => (
          <li
            key={id}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 pl-3 pr-1.5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span className="w-5 shrink-0 text-right text-xs tabular-nums text-zinc-400 dark:text-zinc-600">
              {i + 1}
            </span>
            {/* whitespace-pre keeps authored indentation, which is part of
                the answer for nested code. */}
            <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-sm">
              {byId.get(id)?.text}
            </code>
            <button
              type="button"
              onClick={() => move(i, i - 1)}
              disabled={disabled || i === 0}
              aria-label={`Move line ${i + 1} up`}
              className="rounded px-2 py-1 text-sm hover:bg-zinc-200 disabled:opacity-30 dark:hover:bg-zinc-800"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(i, i + 1)}
              disabled={disabled || i === order.length - 1}
              aria-label={`Move line ${i + 1} down`}
              className="rounded px-2 py-1 text-sm hover:bg-zinc-200 disabled:opacity-30 dark:hover:bg-zinc-800"
            >
              ↓
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
