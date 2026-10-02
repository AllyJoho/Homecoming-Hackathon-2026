'use client';

// @/components/quiz/questions/OrderLines.tsx
// Put shuffled lines back in order (a "Parsons problem"). Drag a line by its
// handle, or use the arrows — the arrows stay because HTML5 drag-and-drop
// reaches neither the keyboard nor touch, and this is a graded question.
//
// Native drag events rather than a DnD library: the list is short, the only
// gesture is "pick one up, drop it between two others", and a dependency for
// that would outweigh the ~30 lines below.
//
// The lines arrive already shuffled by toPublicQuiz. Until the student moves
// something, there's no answer — an untouched list grades as blank.

import { useState } from 'react';

import type { QuestionProps } from './index';

export function OrderLines({ question, answer, onChange, disabled }: QuestionProps<'order_lines'>) {
  const byId = new Map(question.lines.map((line) => [line.id, line]));
  // Indented lines mean nested code, where the monospace alignment is part of
  // the answer. Everything else (most of these are process steps written as
  // sentences) reads better in the body font.
  const isCode = question.lines.some((line) => /^\s/.test(line.text));
  const order = answer?.lineIds ?? question.lines.map((line) => line.id);

  // The line being dragged, and the slot it would land in. Both null when no
  // drag is in flight.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  /** Lift the line at `from` out and drop it back in at `to`. */
  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange({ type: 'order_lines', lineIds: next });
  }

  function endDrag() {
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Drag the lines into the right order, or use the arrows.
      </p>
      <ol className="flex flex-col gap-1.5">
        {order.map((id, i) => {
          const isDragging = dragIndex === i;
          const isTarget = overIndex === i && dragIndex !== null && dragIndex !== i;
          return (
            <li
              key={id}
              draggable={!disabled}
              onDragStart={(event) => {
                setDragIndex(i);
                event.dataTransfer.effectAllowed = 'move';
                // Firefox ignores a drag that carries no payload.
                event.dataTransfer.setData('text/plain', String(i));
              }}
              onDragOver={(event) => {
                // Without preventDefault the browser refuses the drop.
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setOverIndex(i);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex !== null) move(dragIndex, i);
                endDrag();
              }}
              onDragEnd={endDrag}
              className={`flex items-center gap-2 rounded-lg border bg-zinc-50 py-1.5 pl-2 pr-1.5 transition dark:bg-surface-raised ${
                isTarget
                  ? 'border-indigo-500 ring-1 ring-indigo-500/40'
                  : 'border-zinc-200 dark:border-surface-border'
              } ${isDragging ? 'opacity-40' : ''}`}
            >
              {/* The handle is decorative: the whole row is draggable, and the
                  arrows are what a keyboard or touch user reaches for. */}
              <span
                aria-hidden
                className={`shrink-0 select-none px-1 text-sm leading-none text-zinc-400 dark:text-zinc-600 ${
                  disabled ? '' : 'cursor-grab active:cursor-grabbing'
                }`}
              >
                ⠿
              </span>
              <span className="w-5 shrink-0 self-start pt-1 text-right text-xs tabular-nums text-zinc-400 dark:text-zinc-600">
                {i + 1}
              </span>
              {/* pre-wrap keeps authored indentation but still wraps, so a long
                  step can't push the arrows off a narrow screen. */}
              <span
                className={`min-w-0 flex-1 whitespace-pre-wrap break-words py-0.5 text-sm ${
                  isCode ? 'font-mono' : ''
                }`}
              >
                {byId.get(id)?.text}
              </span>
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
          );
        })}
      </ol>
    </div>
  );
}
