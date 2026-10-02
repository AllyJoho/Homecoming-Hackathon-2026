'use client';

// @/app/(main)/recommendations/RecommendationsPanel.tsx
// The client half of the job matches page.
//
// The ranking itself arrives already done — the page scores it on the server
// from stored skill weights, so there is no "rank" button here and nothing to
// wait for. This component only owns the two things that genuinely need a
// client: pulling more listings in, and switching between the ranked view and
// the full list.
//
// Colocated with its route rather than in components/ because nothing else
// uses it — the reusable pieces (JobCard, JobBrowseCard) live under
// components/recommendations/.

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { Job, JobMatchWithJob } from '@/types/job';
import type { ProfileSkill } from '@/types/profile';
import { Button, EmptyState, Spinner } from '@/components/ui';
import { JobMatchList } from '@/components/recommendations/JobMatchList';
import { JobBrowseCard } from '@/components/recommendations/JobBrowseCard';

export interface RecommendationsPanelProps {
  /** Ranked on the server. Empty when the profile has no overlap yet. */
  matches: JobMatchWithJob[];
  /** Everything stored, for the unranked view. */
  jobs: Job[];
  skills: ProfileSkill[];
  quizBySkill: Record<string, string>;
  /** Listings already in the tracker, so the Save button starts in the right state. */
  trackedJobIds: string[];
}

interface IngestSummary {
  stored: number;
  total: number;
  exhausted: boolean;
}

export function RecommendationsPanel({
  matches,
  jobs,
  skills,
  quizBySkill,
  trackedJobIds,
}: RecommendationsPanelProps) {
  const router = useRouter();

  // An array over the wire (a Set isn't serializable across the boundary),
  // rebuilt here so each card is an O(1) lookup rather than a scan.
  const tracked = useMemo(() => new Set(trackedJobIds), [trackedJobIds]);

  // Which list is on screen. Ranked when there's a ranking to show.
  const [showAll, setShowAll] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // router.refresh() re-runs the server component; the transition is what lets
  // us keep the spinner up until the new listings have actually rendered.
  const [refreshing, startTransition] = useTransition();

  const busy = loadingMore || refreshing;
  const ranked = matches.length > 0 && !showAll;

  async function loadMore() {
    setLoadingMore(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/jobs/ingest', { method: 'POST' });
      const body = (await response.json()) as IngestSummary & { error?: string };

      if (!response.ok) throw new Error(body.error ?? 'Could not load listings.');

      setMessage(
        body.exhausted
          ? 'Nothing new on the boards right now — everything they list is already stored.'
          : `Added ${body.stored} listing${body.stored === 1 ? '' : 's'}. ${body.total} stored in total.`,
      );

      // The refresh re-ranks on the server, so the new listings arrive scored.
      startTransition(() => router.refresh());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={loadMore} disabled={busy}>
          {busy ? 'Loading…' : 'Load more listings'}
        </Button>

        {matches.length > 0 && (
          <Button onClick={() => setShowAll((value) => !value)} variant="secondary" disabled={busy}>
            {showAll ? `Show my ${matches.length} matches` : `Show all ${jobs.length} listings`}
          </Button>
        )}

        {busy && <Spinner />}

        {skills.length === 0 && jobs.length > 0 && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Add a skill, or paste your resume, and these rank themselves.
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      {message && (
        <p aria-live="polite" className="text-sm text-zinc-600 dark:text-zinc-400">
          {message}
        </p>
      )}

      {ranked ? (
        <JobMatchList matches={matches} quizBySkill={quizBySkill} trackedJobIds={tracked} />
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No listings stored yet"
          description="Load some from the job boards, or run `npm run jobs:ingest` to fill the database in one go."
          action={
            <Button onClick={loadMore} size="sm" disabled={busy}>
              Load listings
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {jobs.map((job) => (
            <JobBrowseCard
              key={job.id}
              job={job}
              skills={skills}
              quizBySkill={quizBySkill}
              tracked={tracked.has(job.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
