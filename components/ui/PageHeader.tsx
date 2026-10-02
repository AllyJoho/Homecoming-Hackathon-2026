// @/components/ui/PageHeader.tsx
// A consistent page heading, so every screen introduces itself the same way.
//
// This is the purchasing app's PageTitle idea without its branded banner — that
// one is a full-width uppercase hero in BYU grey, which would look out of place
// here. Same job, quieter treatment: title, optional description, optional
// right-hand actions.

import type { ReactNode } from 'react';
import { SECTION_DESCRIPTION, SECTION_TITLE } from './styles';

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Right-aligned actions — buttons, a link, a Tag. */
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-4 ${className}`.trim()}>
      <div className="min-w-0">
        <h1 className={SECTION_TITLE}>{title}</h1>
        {description && <p className={SECTION_DESCRIPTION}>{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
