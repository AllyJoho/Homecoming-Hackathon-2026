// @/components/ui/EmptyState.tsx
// The "nothing here yet" panel. Having one of these stops each feature from
// inventing its own empty copy and spacing.

import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  /** A call to action — usually a Button or a Link. */
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, icon, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700 ${className}`.trim()}
    >
      {icon && <div className="mb-1 text-zinc-400 dark:text-zinc-500">{icon}</div>}
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
