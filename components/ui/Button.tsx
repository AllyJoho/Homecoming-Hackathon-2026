// @/components/ui/Button.tsx
// No 'use client' on purpose: this has no hooks, so it renders in both server
// and client components. A client parent can still pass onClick.
//
// The `loading` / `icon` / `pressed` / `fullWidth` ergonomics and the shared
// class tables come from the purchasing app's general/buttons/Button.

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';
import {
  BUTTON_ICON_SIZE_CLASSES,
  BUTTON_PRESSED_CLASSES,
  BUTTON_SIZE_CLASSES,
  BUTTON_VARIANT_CLASSES,
  DISABLED_CONTROL,
  type ButtonSize,
  type ButtonVariant,
} from './styles';
import { UI_ICONS, type UiIconName } from './icons';

export type { ButtonVariant, ButtonSize };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** `'none'` emits no size/padding/gap classes, so a caller can fully supply
   *  chrome via `className`. */
  size?: ButtonSize | 'none';
  /** An icon name from @/components/ui/icons, or any node. */
  icon?: UiIconName | ReactNode;
  iconPosition?: 'left' | 'right';
  /** Swaps the content for a spinner and disables the button. */
  loading?: boolean;
  loadingLabel?: string;
  fullWidth?: boolean;
  /** Toggle-style sunken look, and sets aria-pressed. */
  pressed?: boolean;
}

function isIconName(icon: unknown): icon is UiIconName {
  return typeof icon === 'string' && icon in UI_ICONS;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  loadingLabel = 'Loading…',
  fullWidth = false,
  pressed = false,
  disabled,
  type = 'button',
  children,
  className = '',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const variantCls = pressed ? BUTTON_PRESSED_CLASSES[variant] : BUTTON_VARIANT_CLASSES[variant];
  // `size="none"` opts out of the size scale entirely; the icon still needs a
  // dimension, so fall back to md's.
  const sizeCls = size === 'none' ? '' : BUTTON_SIZE_CLASSES[size];
  const iconSizeCls =
    size === 'none' ? BUTTON_ICON_SIZE_CLASSES.md : BUTTON_ICON_SIZE_CLASSES[size];

  const Icon = isIconName(icon) ? UI_ICONS[icon] : null;
  const iconNode = Icon ? (
    <Icon className={`${iconSizeCls} shrink-0`} aria-hidden />
  ) : icon && !isIconName(icon) ? (
    icon
  ) : null;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-pressed={pressed || undefined}
      className={`inline-flex cursor-pointer items-center justify-center font-medium transition-colors ${DISABLED_CONTROL} ${variantCls} ${sizeCls} ${fullWidth ? 'w-full' : ''} ${className}`.trim()}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner className="shrink-0" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          {iconNode && iconPosition === 'left' && iconNode}
          {children}
          {iconNode && iconPosition === 'right' && iconNode}
        </>
      )}
    </button>
  );
}
