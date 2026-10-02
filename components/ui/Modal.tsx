'use client';

// @/components/ui/Modal.tsx
// Built on <dialog> so focus trapping and the backdrop come from the platform
// rather than from us.
//
// THREE ways out, and all three matter:
//
//   Escape          — free, from <dialog>
//   backdrop click  — the onClick below; a click landing on the dialog element
//                     itself is outside the panel
//   the × button    — always rendered
//
// The × is not decoration. Without it this component had NO visible dismiss
// affordance, and three of its four callers passed no footer buttons either —
// so a career detail popup was a screen you could only leave if you happened
// to guess at Escape. A modal has to show you the exit.
//
// The height cap matters for the same reason: `m-auto` on a dialog taller than
// the viewport clips it top and bottom with nothing scrollable, which traps
// the reader in content they can't finish or escape. The body scrolls instead.
//
// That cap needs a flex column to work, and the column has to be applied as
// `open:flex` — see the className below for why a bare `flex` left a blank
// panel sitting in the page.

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import { FiX } from './icons';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Accessible name for the × button. Override when "Close" is ambiguous. */
  closeLabel?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  closeLabel = 'Close',
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    // showModal()/close() are imperative, so `open` is mirrored here rather
    // than passed as the `open` attribute (which skips the backdrop).
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title ? undefined : closeLabel}
      // Fires on Escape too, so the parent's state stays in sync.
      onClose={onClose}
      onClick={(event) => {
        // A click that lands on the dialog element itself is a backdrop click;
        // clicks on children bubble from inside the inner div.
        if (event.target === ref.current) onClose();
      }}
      // `open:flex`, not `flex`: a plain `display:flex` here is an author
      // declaration, and it beats the user-agent's `dialog:not([open]) {
      // display: none }` — so every closed Modal rendered as a blank panel in
      // the page flow (absolutely positioned, so it surfaced at the top of
      // whichever page mounted one). Scoping the display to `[open]` lets the
      // UA keep hiding it while closed.
      className="m-auto max-h-[85vh] w-[min(32rem,calc(100vw-2rem))] open:flex open:flex-col rounded-xl border border-zinc-200 bg-white p-0 backdrop:bg-black/40 dark:border-surface-border dark:bg-surface"
    >
      {/* Outside the scrolling region, not sticky: only the body below
          scrolls, so the title and the exit stay put without position tricks. */}
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
        {title ? (
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="-mt-1 -mr-1 shrink-0 cursor-pointer rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          <FiX className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* min-h-0 is what lets this shrink inside the flex column so
          overflow-y-auto actually engages, rather than the body growing and
          pushing the dialog past max-h. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 text-sm text-zinc-700 dark:text-zinc-300">
        {children}
      </div>

      {footer && (
        <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-3 dark:border-surface-border">
          {footer}
        </div>
      )}
    </dialog>
  );
}
