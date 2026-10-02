// @/components/careers/CareerMatchCard.tsx
// "Where you're headed": the career archetype a student's skills point at,
// plus where each of its skills stands for them.
//
// No model call behind this one — the scores come from @/lib/careers/match,
// which is arithmetic over the authored weights in data/careers.json. That's
// why it can render on page load while the AI job matches below it wait for a
// button press.

import Link from 'next/link';
import type { CareerMatch } from '@/types/career';
import { Card, Tag, categoryColor } from '@/components/ui';

export interface CareerMatchCardProps {
  /** Best fit first. The first is the headline; the rest render as alternates. */
  matches: CareerMatch[];
  /** slug → quizId, for "take the quiz" links. Built by the page. */
  quizBySkill?: Record<string, string>;
}

/**
 * One colour per provenance, so the chip list reads as a progress bar: green
 * is banked, blue is claimed but unproven, yellow is the work left.
 */
const SKILL_STATUS = {
  certified: { variant: 'success', label: 'Certified', dot: 'bg-emerald-500' },
  claimed: { variant: 'info', label: 'My skills', dot: 'bg-sky-500' },
  missing: { variant: 'warning', label: 'Missing', dot: 'bg-amber-500' },
} as const;

type SkillStatus = keyof typeof SKILL_STATUS;

export function CareerMatchCard({ matches, quizBySkill = {} }: CareerMatchCardProps) {
  const [top, ...alternates] = matches;
  if (!top) return null;

  // The field's hue, matched to the skills board and the career list.
  const fieldColor = categoryColor(top.career.field);

  // Certified wins over claimed: a quiz-proven skill is also in "my skills",
  // and the stronger provenance is the one worth showing.
  const certified = new Set(top.provenSkills);
  const claimed = new Set(top.claimedSkills);
  const statusOf = (slug: string): SkillStatus =>
    certified.has(slug) ? 'certified' : claimed.has(slug) ? 'claimed' : 'missing';

  // A claimed-but-uncertified skill is the better prompt than a missing one:
  // it's a quiz they can pass today, and it moves half credit to full. Only
  // once every claimed skill is certified does "learn something new" become
  // the next step. career.skills is heaviest-weight first, so taking the first
  // of each kind takes the most valuable one.
  const nextSkill =
    top.career.skills.find(
      (skill) => statusOf(skill.slug) === 'claimed' && quizBySkill[skill.slug],
    ) ??
    top.career.skills.find((skill) => statusOf(skill.slug) === 'claimed') ??
    top.missingSkills[0];
  const nextQuizId = nextSkill ? quizBySkill[nextSkill.slug] : undefined;

  return (
    <Card
      title="Where you're headed"
      action={
        <Tag variant={top.score >= 70 ? 'success' : top.score >= 40 ? 'info' : 'neutral'}>
          {top.score}% match
        </Tag>
      }
    >
      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{top.career.title}</p>
      <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
        {/* The field shares its hue with every skill card in that category, so
            a career and the skills it needs read as one colour family. */}
        <span className={`font-medium ${categoryColor(top.career.field).text}`}>
          {top.career.field}
        </span>{' '}
        · {top.provenSkills.length} of {top.career.skills.length} skills proven
        {top.claimedSkills.length > 0 && `, ${top.claimedSkills.length} self-reported`}
      </p>

      {top.career.description && (
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{top.career.description}</p>
      )}

      {top.career.skills.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Skills for this career
            </p>
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {(Object.keys(SKILL_STATUS) as SkillStatus[]).map((status) => (
                <li
                  key={status}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${SKILL_STATUS[status].dot}`}
                    aria-hidden
                  />
                  {SKILL_STATUS[status].label}
                </li>
              ))}
            </ul>
          </div>

          <ul className="flex flex-wrap gap-2">
            {top.career.skills.map((skill) => {
              const status = statusOf(skill.slug);
              const { variant, label } = SKILL_STATUS[status];
              // Certified skills have nothing left to take; the others link to
              // the quiz that would turn them green.
              const quizId = status === 'certified' ? undefined : quizBySkill[skill.slug];
              const chip = (
                <Tag variant={variant} className={quizId ? 'hover:opacity-80' : undefined}>
                  {skill.name}
                </Tag>
              );

              return (
                <li key={skill.slug} title={`${skill.name} — ${label}`}>
                  {quizId ? <Link href={`/quizzes/${quizId}`}>{chip}</Link> : chip}
                </li>
              );
            })}
          </ul>

          {nextSkill && (
            <p className="mt-2.5 text-sm text-zinc-600 dark:text-zinc-400">
              Next up:{' '}
              {nextQuizId ? (
                <Link
                  href={`/quizzes/${nextQuizId}`}
                  className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900 dark:text-zinc-50 dark:decoration-zinc-600 dark:hover:decoration-zinc-50"
                >
                  take the {nextSkill.name} quiz
                </Link>
              ) : (
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  learn {nextSkill.name}
                </span>
              )}
            </p>
          )}
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
