// @/components/careers/CareerMatchCard.tsx
// "Where you're headed": the career archetype a student's skills point at,
// plus the next skills that would move them along it.
//
// No model call behind this one — the scores come from @/lib/careers/match,
// which is arithmetic over the authored weights in data/careers.json. That's
// why it can render on page load while the AI job matches below it wait for a
// button press.

import Link from 'next/link';
import type { CareerMatch } from '@/types/career';
import { Card, Tag } from '@/components/ui';

export interface CareerMatchCardProps {
  /** Best fit first. The first is the headline; the rest render as alternates. */
  matches: CareerMatch[];
  /** slug → quizId, for "take the quiz" links. Built by the page. */
  quizBySkill?: Record<string, string>;
}

/** Enough to act on without the chip list becoming a wall. */
const NEXT_SKILL_LIMIT = 4;

export function CareerMatchCard({ matches, quizBySkill = {} }: CareerMatchCardProps) {
  const [top, ...alternates] = matches;
  if (!top) return null;

  // Already heaviest-weight first out of listCareers, so the first chip is the
  // single most valuable quiz this student could take.
  const next = top.missingSkills.slice(0, NEXT_SKILL_LIMIT);

  return (
    <Card
      title="Where you're headed"
      action={
        <Tag tone={top.score >= 70 ? 'success' : top.score >= 40 ? 'info' : 'neutral'}>
          {top.score}% match
        </Tag>
      }
    >
      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{top.career.title}</p>
      <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
        {top.career.field} · {top.provenSkills.length} of {top.career.skills.length} skills proven
        {top.claimedSkills.length > 0 && `, ${top.claimedSkills.length} self-reported`}
      </p>

      {top.career.description && (
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{top.career.description}</p>
      )}

      {next.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Learn these next
          </p>
          <ul className="flex flex-wrap gap-2">
            {next.map((skill) => {
              const quizId = quizBySkill[skill.slug];
              return (
                <li key={skill.slug}>
                  {quizId ? (
                    <Link href={`/quizzes/${quizId}`}>
                      <Tag tone="info">{skill.name} — take the quiz</Tag>
                    </Link>
                  ) : (
                    <Tag tone="neutral">{skill.name}</Tag>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {alternates.length > 0 && (
        <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Also close
          </p>
          <ul className="flex flex-col gap-1.5">
            {alternates.map((match) => (
              <li
                key={match.career.slug}
                className="flex items-baseline justify-between gap-4 text-sm"
              >
                <span className="text-zinc-700 dark:text-zinc-300">{match.career.title}</span>
                <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                  {match.score}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
