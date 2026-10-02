'use client';

// @/components/quiz/FeedbackPanel.tsx
// The Coaching card on the results screen: asks
// /api/results/[resultId]/feedback to explain the questions the student got
// wrong, and renders the prose that comes back.
//
// Lives under components/ rather than beside its route — the colocation
// pattern RecommendationsPanel follows — because ResultSummary renders it, and
// a component importing from app/ would invert the dependency direction.
//
// Opt-in rather than automatic: the call costs money and tokens, and a student
// who already understands their mistakes shouldn't pay for an explanation they
// didn't ask for.

import { useState } from 'react';
import { Button, Card } from '@/components/ui';

export interface FeedbackPanelProps {
  /** QuizAttempt id — the route re-grades the stored answer sheet from it. */
  attemptId: string;
  /** Drives the idle copy. ResultSummary only mounts this when it's > 0. */
  missedCount: number;
}

export function FeedbackPanel({ attemptId, missedCount }: FeedbackPanelProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/results/${attemptId}/feedback`, { method: 'POST' });
      const body = (await response.json()) as { feedback?: string; error?: string };

      if (!response.ok) throw new Error(body.error ?? 'Could not get feedback.');

      setFeedback(body.feedback ?? '');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Card
      title="Coaching"
      action={
        <Button onClick={run} disabled={pending} variant="secondary" size="sm">
          {pending ? 'Thinking…' : feedback ? 'Explain again' : 'Explain what I missed'}
        </Button>
      }
    >
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      {!feedback && !error && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {missedCount === 1
            ? 'Walk through the question you missed.'
            : `Walk through the ${missedCount} questions you missed.`}
        </p>
      )}

      {/* The model returns prose, not markdown — split on blank lines so
          paragraphs survive without pulling in a renderer. */}
      {feedback && (
        <div
          aria-live="polite"
          className="flex flex-col gap-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
        >
          {feedback
            .split(/\n{2,}/)
            .map((paragraph) => paragraph.trim())
            .filter(Boolean)
            .map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
        </div>
      )}
    </Card>
  );
}
