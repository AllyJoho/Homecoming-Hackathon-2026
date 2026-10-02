// @/components/recommendations/JobMatchList.tsx

import type { JobMatchWithJob } from '@/types/job';
import { JobCard } from './JobCard';

export interface JobMatchListProps {
  matches: JobMatchWithJob[];
  quizBySkill?: Record<string, string>;
  /** Job ids already in the tracker, so each card knows its save state. */
  trackedJobIds?: Set<string>;
}

export function JobMatchList({ matches, quizBySkill, trackedJobIds }: JobMatchListProps) {
  if (matches.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No strong matches yet. Add a few more skills or pass a quiz, then run it again.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {matches.map((match) => (
        <JobCard
          key={match.jobId}
          match={match}
          quizBySkill={quizBySkill}
          tracked={trackedJobIds?.has(match.jobId)}
        />
      ))}
    </div>
  );
}
