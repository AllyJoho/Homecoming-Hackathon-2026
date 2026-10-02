'use client';

// @/components/applications/SaveJobButton.tsx
// The tracker's entry point from a job listing: a square + in the card header.
//
// Icon-only because of where it sits — the header row already carries the
// title and the fit score, and a full "Save to tracker" label there crowded
// the heading. A + next to a listing is a familiar enough "add this" that the
// words are carried by the tooltip and the accessible label instead.
//
// A client island inside the otherwise-server JobCard, so the card itself
// doesn't have to become a client component to carry one button.
//
// It posts only `jobId` — createApplication reads the title and company off
// the Job row rather than trusting them from here, so what gets stored is
// always what the listing says.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button, Spinner } from '@/components/ui';
import { FiCheck, FiPlus } from '@/components/ui/icons';

export interface SaveJobButtonProps {
  jobId: string;
  /** True when this listing is already in the tracker. */
  tracked?: boolean;
}

/** One square for both states, so the header doesn't reflow when you save. */
const SQUARE = 'h-8 w-8 shrink-0 rounded-lg';

export function SaveJobButton({ jobId, tracked = false }: SaveJobButtonProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(tracked);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      // Optimistic: the button is its own state, and a failure flips it back
      // rather than leaving it claiming a save that didn't happen.
      setSaved(true);
      try {
        const response = await fetch('/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? 'Could not save that job.');
        }
        router.refresh();
      } catch (caught) {
        setSaved(false);
        setError(caught instanceof Error ? caught.message : 'Something went wrong.');
      }
    });
  }

  // Once tracked, the square becomes the way through to the tracker. Still a
  // square so the row doesn't shift, and a link rather than a button because
  // there's nothing left to save.
  if (saved) {
    return (
      <Link
        href="/applications"
        aria-label="Tracked — view in your applications"
        title="Tracked — view in your applications"
        className={`inline-flex items-center justify-center border border-emerald-200 bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400 dark:hover:bg-emerald-900 ${SQUARE}`}
      >
        <FiCheck className="h-4 w-4" aria-hidden />
      </Link>
    );
  }

  return (
    <>
      <Button
        variant="secondary"
        // `size="none"` drops the size scale so the square's own dimensions win.
        size="none"
        className={SQUARE}
        disabled={pending}
        onClick={save}
        // The label the icon can't carry. `title` covers a mouse, `aria-label`
        // a screen reader; a failure puts the reason in the tooltip rather than
        // adding a line of text that would reflow the header.
        aria-label={error ? `Save to tracker — ${error}` : 'Save to tracker'}
        title={error ? `${error} Click to try again.` : 'Save to tracker'}
        icon={pending ? <Spinner className="h-4 w-4" /> : <FiPlus className="h-4 w-4" />}
      />
      {/* Announced once on failure; the tooltip is what a sighted user sees. */}
      {error && (
        <span role="alert" className="sr-only">
          {error}
        </span>
      )}
    </>
  );
}
