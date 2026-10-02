'use client';

// @/app/(main)/recommendations/RecommendationsPanel.tsx
// The client half of the recommendations page: triggers the model call and
// renders whatever comes back.
//
// Colocated with its route rather than in components/ because nothing else
// uses it — the shared, reusable pieces (JobCard, JobMatchList) are the ones
// that live under components/recommendations/.

import { useState } from 'react';
import type { JobMatchWithJob } from '@/types/job';
import { Button } from '@/components/ui';
import { JobMatchList } from '@/components/recommendations/JobMatchList';

export interface RecommendationsPanelProps {
  hasSkills: boolean;
  quizBySkill: Record<string, string>;
}

export function RecommendationsPanel({ hasSkills, quizBySkill }: RecommendationsPanelProps) {
  const [matches, setMatches] = useState<JobMatchWithJob[] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/recommendations', { method: 'POST' });
      const body = (await response.json()) as {
        matches?: JobMatchWithJob[];
        message?: string;
        error?: string;
      };

      if (!response.ok) throw new Error(body.error ?? 'Could not get recommendations.');

      setMatches(body.matches ?? []);
      setMessage(body.message ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button onClick={run} disabled={pending || !hasSkills} size="lg">
          {pending ? 'Thinking…' : matches ? 'Run again' : 'Find my matches'}
        </Button>
        {!hasSkills && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Add a skill on the home page first.
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      {message && <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>}

      {matches && <JobMatchList matches={matches} quizBySkill={quizBySkill} />}
    </div>
  );
}
