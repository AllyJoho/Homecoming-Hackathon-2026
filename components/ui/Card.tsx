// @/components/ui/Card.tsx
// The one surface treatment in the app. Everything that looks like a panel
// should use this so spacing and borders stay consistent.

import type { ReactNode } from 'react';

export interface CardProps {
  title?: ReactNode;
  /** Right-aligned content in the header row — a button or a Tag. */
  action?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Card({ title, action, footer, className = '', children }: CardProps) {
  return (
    <section
      className={`rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 ${className}`}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          {typeof title === 'string' ? (
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
          ) : (
            title
          )}
          {action}
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
      {footer && (
        <footer className="border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">{footer}</footer>
      )}
    </section>
  );
}
