// @/components/ui/Toast.tsx
// Transient feedback, adapted from the purchasing app's general/feedback/Toast:
// same left-border-per-type treatment and self-dismiss timing, neutral colours.
'use client';

import { useEffect, useState } from 'react';
import {
  FaCircleCheck,
  FaCircleInfo,
  FaCircleXmark,
  FaTriangleExclamation,
  FaXmark,
  type IconType,
} from './icons';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  type: ToastType;
  title: string;
  message?: string;
  onClose?: () => void;
  /** Milliseconds on screen. 0 keeps it up until dismissed. */
  duration?: number;
}

const TYPE_STYLES: Record<ToastType, { border: string; icon: string; Icon: IconType }> = {
  success: {
    border: 'border-l-emerald-500',
    icon: 'text-emerald-500',
    Icon: FaCircleCheck,
  },
  error: { border: 'border-l-red-500', icon: 'text-red-500', Icon: FaCircleXmark },
  info: { border: 'border-l-sky-500', icon: 'text-sky-500', Icon: FaCircleInfo },
  warning: {
    border: 'border-l-amber-500',
    icon: 'text-amber-500',
    Icon: FaTriangleExclamation,
  },
};

// Keep in sync with the literal `duration-300` class below: Tailwind's build
// scanner needs a static class name, so it can't read a constant.
const EXIT_MS = 300;

export function Toast({ type, title, message, onClose, duration = 5000 }: ToastProps) {
  const { border, icon, Icon } = TYPE_STYLES[type];
  const [visible, setVisible] = useState(false);

  // Mount at opacity 0, then flip on the next frame so the transition runs.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!duration) return;
    const hide = setTimeout(() => setVisible(false), duration);
    const done = setTimeout(() => onClose?.(), duration + EXIT_MS);
    return () => {
      clearTimeout(hide);
      clearTimeout(done);
    };
  }, [duration, onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex w-full max-w-sm items-start gap-3 rounded-lg border border-zinc-200 border-l-4 bg-white px-4 py-3 shadow-lg transition-all duration-300 dark:border-surface-border dark:bg-surface-raised ${border} ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
      }`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${icon}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{title}</p>
        {message && <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{message}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            setTimeout(() => onClose(), EXIT_MS);
          }}
          aria-label="Dismiss"
          className="cursor-pointer text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200"
        >
          <FaXmark className="h-3 w-3" aria-hidden />
        </button>
      )}
    </div>
  );
}

/** Fixed bottom-right stack. Render one of these near the root of a page. */
export function ToastStack({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2">
      <div className="pointer-events-auto flex flex-col items-end gap-2">{children}</div>
    </div>
  );
}
