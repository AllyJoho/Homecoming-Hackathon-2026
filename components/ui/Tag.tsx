// @/components/ui/Tag.tsx
// Small status pill. `tone` is the visual vocabulary for skill provenance:
// a QUIZ-proven skill reads as `success`, a self-reported one as `neutral`.

import type { ReactNode } from 'react';

type Tone = 'neutral' | 'success' | 'warning' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  info: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
};

export interface TagProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

export function Tag({ tone = 'neutral', children, className = '' }: TagProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
