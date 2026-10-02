// @/components/ui/Tag.tsx
// Small status pill. `variant` picks the colour and `solid` the treatment —
// soft (tinted, quieter, better in lists) or solid (filled, stands alone) —
// the split the purchasing app's general/content/Tag uses.
//
// `tone` is the original prop of this component and still works: it maps onto
// `variant`, so the thirteen call sites that already pass it keep rendering
// exactly as before.

import type { ReactNode } from 'react';
import { formatEnums } from '@/utils/formatEnums';
import {
  TAG_DISMISS_HOVER_CLASSES,
  TAG_SIZE_CLASSES,
  TAG_VARIANT_CLASSES,
  type TagSize,
  type TagVariant,
} from './styles';
import { FaXmark } from './icons';

export type { TagVariant, TagSize };

/** The pre-existing prop name for a variant. Kept so call sites don't churn. */
export type Tone = 'neutral' | 'success' | 'warning' | 'info';

export interface TagProps {
  /** @deprecated Prefer `variant`; this is the original spelling and is equivalent. */
  tone?: Tone;
  variant?: TagVariant;
  size?: TagSize;
  /** Filled background with white text. Defaults to the soft tinted treatment. */
  solid?: boolean;
  /** Renders a dismiss × button and calls this when clicked. */
  onDismiss?: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * String children run through `formatEnums`, so a raw enum value like
 * `SELF_REPORTED` renders as `Self Reported` without every call site
 * remembering to format it.
 */
export function Tag({
  tone,
  variant,
  size = 'md',
  solid = false,
  onDismiss,
  children,
  className = '',
}: TagProps) {
  const resolved: TagVariant = variant ?? tone ?? 'neutral';
  const treatment = solid ? 'solid' : 'soft';
  const label = typeof children === 'string' ? formatEnums(children) : children;

  return (
    <span
      className={`inline-flex items-center justify-center gap-1 rounded-full font-medium ${TAG_VARIANT_CLASSES[resolved][treatment]} ${TAG_SIZE_CLASSES[size]} ${className}`.trim()}
    >
      {label}

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={typeof children === 'string' ? `Remove ${formatEnums(children)}` : 'Remove'}
          className={`ml-0.5 cursor-pointer rounded-full p-0.5 transition-colors ${TAG_DISMISS_HOVER_CLASSES[resolved][treatment]}`}
        >
          <FaXmark className="h-2.5 w-2.5" aria-hidden />
        </button>
      )}
    </span>
  );
}
