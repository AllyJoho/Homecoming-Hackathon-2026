// @/components/ui/CountBadge.tsx
// Ported from the purchasing app. Sits on a surface with a ring, so it carries
// its own brighter palette rather than reusing Tag's.

import type { ReactNode } from 'react';
import {
  COUNT_BADGE_SIZE_CLASSES,
  COUNT_BADGE_VARIANT_CLASSES,
  type CountBadgeSize,
  type CountBadgeVariant,
} from './styles';

export type { CountBadgeVariant, CountBadgeSize };

export interface CountBadgeProps {
  children: ReactNode;
  variant?: CountBadgeVariant;
  size?: CountBadgeSize;
  className?: string;
}

export function CountBadge({
  children,
  variant = 'accent',
  size = 'md',
  className = '',
}: CountBadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold ring-2 ring-white dark:ring-zinc-950 ${COUNT_BADGE_VARIANT_CLASSES[variant]} ${COUNT_BADGE_SIZE_CLASSES[size]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
