'use client';

// @/components/ui/Modal.tsx
// Built on <dialog> so focus trapping and the backdrop come from the platform
// rather than from us. Escape and backdrop clicks both close.

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
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
      // Fires on Escape too, so the parent's state stays in sync.
      onClose={onClose}
      onClick={(event) => {
        // A click that lands on the dialog element itself is a backdrop click;
        // clicks on children bubble from inside the inner div.
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-zinc-200 bg-white p-0 backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="p-5">
        {title && (
          <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
        )}
        <div className="text-sm text-zinc-700 dark:text-zinc-300">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </dialog>
  );
}
