'use client';

// @/components/experience/BulletReword.tsx
// The "Reword with AI" panel inside the experience form: every bullet shown
// next to its suggested rewrite, accepted one at a time.
//
// Side by side rather than in place, which is the whole design. A button that
// silently replaces the textarea asks the student to trust that nothing was
// changed, and that is exactly the thing an LLM cannot promise — the rewrite
// that drops "40-table" or quietly promotes "helped" to "led" looks fine until
// an interviewer asks about it. Showing both and making them choose means a
// drifted rewrite is caught by the one person who knows what actually
// happened.
//
// Rewrites that invented a figure never reach this component as suggestions —
// @/lib/profile/rewordGuard rejects them server-side and they arrive as
// unchanged bullets with a note saying what the model tried. The note is shown
// rather than swallowed: a student who sees the guard working trusts the
// suggestions it did pass.
//
// Nothing here saves. Accepting writes back into the form's textarea, and the
// student still presses Save.

import { useState } from 'react';

import type { ExperienceKind } from '@/types/experience';
import { Button, GROUP_HEADING } from '@/components/ui';

/** Mirrors RewordedBullet in @/lib/profile/reword. */
interface Suggestion {
  index: number;
  original: string;
  suggestion: string;
  changed: boolean;
  note?: string;
}

export interface BulletRewordProps {
  /** Context for the prompt — what kind of writing this entry wants. */
  kind: ExperienceKind;
  title: string;
  organization: string;
  /** The bullets currently in the form, already split and trimmed. */
  bullets: string[];
  /** Hands back the full bullet list with the accepted rewrites swapped in. */
  onApply: (bullets: string[]) => void;
  disabled?: boolean;
}

export function BulletReword({
  kind,
  title,
  organization,
  bullets,
  onApply,
  disabled,
}: BulletRewordProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/experience/reword', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, title, organization, bullets }),
      });

      const body = (await response.json().catch(() => null)) as {
        bullets?: Suggestion[];
        error?: string;
      } | null;

      if (!response.ok || !body?.bullets) {
        throw new Error(body?.error ?? 'Could not reword those.');
      }

      setSuggestions(body.bullets);
      // Pre-checked: the student came here wanting the rewrites, so the common
      // path is "glance, then apply". Unchecking is cheaper than checking five.
      setAccepted(new Set(body.bullets.filter((b) => b.changed).map((b) => b.index)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  function toggle(index: number) {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function apply() {
    if (!suggestions) return;
    onApply(
      suggestions.map((item) => (accepted.has(item.index) ? item.suggestion : item.original)),
    );
    setSuggestions(null);
    setAccepted(new Set());
  }

  if (!suggestions) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Button
            onClick={run}
            variant="subtle"
            size="sm"
            loading={pending}
            loadingLabel="Rewording…"
            disabled={disabled || bullets.length === 0}
          >
            Reword with AI
          </Button>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {bullets.length === 0
              ? 'Write a bullet first.'
              : 'Suggests wording only. Your numbers and scope are checked and kept.'}
          </p>
        </div>
        {error && <RewordError message={error} />}
      </div>
    );
  }

  const changedCount = suggestions.filter((item) => item.changed).length;
  const acceptedCount = suggestions.filter((item) => accepted.has(item.index)).length;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-900 dark:bg-indigo-950/20">
      <div className="flex items-start justify-between gap-3">
        <p className={GROUP_HEADING}>
          {changedCount === 0
            ? 'No changes suggested'
            : `${changedCount} suggestion${changedCount === 1 ? '' : 's'}`}
        </p>
        <button
          type="button"
          onClick={() => setSuggestions(null)}
          className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Discard
        </button>
      </div>

      {changedCount === 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          These read well as they are. Nothing worth changing.
        </p>
      )}

      <ol className="flex flex-col gap-3">
        {suggestions.map((item) => (
          <li
            key={item.index}
            className="rounded-md border border-zinc-200 bg-white p-2.5 dark:border-surface-border dark:bg-surface"
          >
            {item.changed ? (
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={accepted.has(item.index)}
                  onChange={() => toggle(item.index)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 dark:border-zinc-600"
                />
                <span className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-sm leading-relaxed text-zinc-900 dark:text-zinc-50">
                    {item.suggestion}
                  </span>
                  <span className="text-xs leading-relaxed text-zinc-500 line-through dark:text-zinc-500">
                    {item.original}
                  </span>
                  {item.note && <Note text={item.note} tone="warn" />}
                </span>
              </label>
            ) : (
              // Unchanged, for one of two reasons: the model judged the bullet
              // fine, or the guard refused what it returned. The note says
              // which — and it stays visible, because "the rewrite added a
              // number your bullet doesn't have" is the most reassuring thing
              // this panel can tell a student.
              <div className="flex flex-col gap-[6px] pl-[26px]">
                <span className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {item.original}
                </span>
                <Note text={item.note ?? 'Already reads well — nothing changed.'} tone="muted" />
              </div>
            )}
          </li>
        ))}
      </ol>

      {error && <RewordError message={error} />}

      {changedCount > 0 && (
        <div className="flex items-center gap-2">
          <Button onClick={apply} size="sm" disabled={acceptedCount === 0}>
            {acceptedCount === 0
              ? 'Nothing selected'
              : `Apply ${acceptedCount} change${acceptedCount === 1 ? '' : 's'}`}
          </Button>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Goes into the box above — you still press Save.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * A note under a bullet. The text arrives from the server already written as a
 * complete fragment (see @/lib/profile/reword), so this only colours it —
 * amber for something to look at on a rewrite being offered, grey for an
 * explanation of why a bullet was left alone.
 */
function Note({ text, tone }: { text: string; tone: 'warn' | 'muted' }) {
  return (
    <span
      className={`text-xs leading-relaxed ${
        tone === 'warn'
          ? 'text-amber-700 dark:text-amber-400'
          : 'text-zinc-500 dark:text-zinc-400'
      }`}
    >
      {tone === 'warn' ? `Heads up: ${text}` : text}
    </span>
  );
}

function RewordError({ message }: { message: string }) {
  return (
    <p role="alert" className="text-sm text-red-700 dark:text-red-400">
      {message}
    </p>
  );
}
