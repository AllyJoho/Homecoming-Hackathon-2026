// @/components/recommendations/JobBrowseCard.tsx
// A listing as stored, before any model has ranked it.
//
// This is what /recommendations shows on load, so it has to be worth reading
// without an AI call. The overlap it displays — which required skills you
// already have — is a set intersection, free and instant. The AI's job is the
// part this can't do: judging how much partial, self-reported overlap is
// actually worth and saying so in words.

import Link from 'next/link';
import type { Job } from '@/types/job';
import type { ProfileSkill } from '@/types/profile';
import { Card, Tag, GROUP_HEADING } from '@/components/ui';
import { SaveJobButton } from '@/components/applications/SaveJobButton';
import { JobTitle } from './JobTitle';

export interface JobBrowseCardProps {
  job: Job;
  /** The student's skills, for the overlap readout. */
  skills: ProfileSkill[];
  quizBySkill?: Record<string, string>;
  /** True when this listing is already in the student's tracker. */
  tracked?: boolean;
}

export function JobBrowseCard({
  job,
  skills,
  quizBySkill = {},
  tracked = false,
}: JobBrowseCardProps) {
  const sourceBySlug = new Map(skills.map((skill) => [skill.slug, skill.source]));
  const held = job.requiredSkills.filter((slug) => sourceBySlug.has(slug));

  return (
    <Card
      title={<JobTitle title={job.title} url={job.url} />}
      headerAlign="center"
      subtitle={`${job.company} · ${job.remote ? `${job.location} (remote)` : job.location}`}
      action={
        // Wraps on a narrow card rather than squeezing the heading: the header
        // keeps `action` at its natural width.
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Tag variant="neutral">{job.level}</Tag>
          {job.requiredSkills.length > 0 && (
            <Tag variant={held.length === job.requiredSkills.length ? 'success' : 'info'}>
              {held.length}/{job.requiredSkills.length} skills
            </Tag>
          )}
          <SaveJobButton jobId={job.id} tracked={tracked} />
        </div>
      }
    >
      {job.salaryRange && (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{job.salaryRange}</p>
      )}

      {job.requiredSkills.length > 0 && (
        <div className="mt-3">
          <p className={GROUP_HEADING}>Required</p>
          <ul className="mt-1.5 flex flex-wrap gap-2">
            {job.requiredSkills.map((slug) => {
              const source = sourceBySlug.get(slug);
              const quizId = quizBySkill[slug];

              // Three states, and they're the whole point of the card:
              // proven, claimed-but-unproven (with the quiz that fixes it),
              // and don't-have-it.
              if (source === 'QUIZ') {
                return (
                  <li key={slug}>
                    <Tag variant="success">{slug} ✓</Tag>
                  </li>
                );
              }
              return (
                <li key={slug}>
                  {quizId ? (
                    <Link href={`/quizzes/${quizId}`}>
                      <Tag variant="info">{slug} — take the quiz</Tag>
                    </Link>
                  ) : (
                    <Tag variant={source ? 'warning' : 'neutral'}>{slug}</Tag>
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
