// @/components/ui/Card.tsx
// The one surface treatment in the app. Everything that looks like a panel
// should use this so spacing and borders stay consistent.
//
// The surface and hover strings live in ./styles (CARD_SURFACE / CARD_HOVER /
// CARD_HOVER_LIFT), and the optional accent stripe is the purchasing app's
// general/content/Card idea — good for marking a card's status in a list.
// `title` / `action` / `footer` are unchanged, so existing call sites are safe.

import type { ReactNode } from 'react';
import { CARD_HOVER, CARD_HOVER_LIFT, CARD_SURFACE } from './styles';

export interface CardProps {
  title?: ReactNode;
  /** A quieter line under the title. */
  subtitle?: ReactNode;
  /** Right-aligned content in the header row — a button or a Tag. */
  action?: ReactNode;
  footer?: ReactNode;
  /** `true` for a shadow grow, `'lift'` for the stronger clickable-card hover. */
  hover?: boolean | 'lift';
  /** A coloured stripe down the left edge. Any Tailwind bg class. */
  accent?: string;
  /** Drops the body padding, for a card whose child owns its own spacing. */
  flush?: boolean;
  className?: string;
  children: ReactNode;
}

export function Card({
  title,
  subtitle,
  action,
  footer,
  hover = false,
  accent,
  flush = false,
  className = '',
  children,
}: CardProps) {
  const hoverCls = hover === 'lift' ? CARD_HOVER_LIFT : hover ? CARD_HOVER : '';

  return (
    <section className={`flex overflow-hidden ${CARD_SURFACE} ${hoverCls} ${className}`.trim()}>
      {accent && <div className={`w-1 shrink-0 ${accent}`} aria-hidden />}

      <div className="flex min-w-0 flex-1 flex-col">
        {(title || action) && (
          <header className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <div className="min-w-0">
              {typeof title === 'string' ? (
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
              ) : (
                title
              )}
              {subtitle && (
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
              )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </header>
        )}

        <div className={flush ? 'flex-1' : 'flex-1 px-5 py-4'}>{children}</div>

        {footer && (
          <footer className="border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
            {footer}
          </footer>
        )}
      </div>
    </section>
  );
}
