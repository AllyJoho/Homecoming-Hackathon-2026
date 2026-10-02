// @/components/recommendations/JobCard.tsx
// A ranked listing: the job, why it matched, and what's missing.
//
// `missingSkills` is the hook back into the product loop — each one links to
// the quiz that would prove it, if such a quiz exists.

import Link from 'next/link';
import type { JobMatchWithJob } from '@/types/job';
import { Card, Tag } from '@/components/ui';
import { SaveJobButton } from '@/components/applications/SaveJobButton';
import { JobTitle } from './JobTitle';

export interface JobCardProps {
  match: JobMatchWithJob;
  /** slug → quizId, for "take the quiz" links. Built by the page. */
  quizBySkill?: Record<string, string>;
  /** True when this listing is already in the student's tracker. */
  tracked?: boolean;
}

export function JobCard({ match, quizBySkill = {}, tracked = false }: JobCardProps) {
  const { job, score, reasons, missingSkills } = match;

  return (
    <Card
      title={<JobTitle title={job.title} url={job.url} />}
      headerAlign="center"
      action={
        <div className="flex items-center gap-2">
          <Tag tone={score >= 80 ? 'success' : score >= 50 ? 'info' : 'neutral'}>{score}% fit</Tag>
          <SaveJobButton jobId={job.id} tracked={tracked} />
        </div>
      }
    >
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        {job.company} · {job.remote ? `${job.location} (remote)` : job.location} · {job.level}
        {job.salaryRange ? ` · ${job.salaryRange}` : ''}
      </p>

      <ul className="mt-3 flex flex-col gap-1">
        {reasons.map((reason) => (
          <li key={reason} className="text-sm text-zinc-600 dark:text-zinc-400">
            — {reason}
          </li>
        ))}
      </ul>

      {missingSkills.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Not proven yet
          </p>
          <ul className="flex flex-wrap gap-2">
            {missingSkills.map((slug) => {
              const quizId = quizBySkill[slug];
              return (
                <li key={slug}>
                  {quizId ? (
                    <Link href={`/quizzes/${quizId}`}>
                      <Tag tone="info">{slug} — take the quiz</Tag>
                    </Link>
                  ) : (
                    <Tag tone="warning">{slug}</Tag>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}
