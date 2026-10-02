// @/components/careers/CareerDetail.tsx
// One career, explained: its field, how much of it the student has, and where
// every one of its skills stands for them.
//
// Extracted so the "Where you're headed" card and the popup on the All
// careers list render the SAME thing. They used to be one component and a
// one-line row; adding a detail popup would have meant writing this a second
// time and letting the two drift apart the first time someone edited one.
//
// No Card wrapper and no heading of its own — the two callers supply their own
// chrome (a Card header, a Modal title), so this is just the body.

import Link from 'next/link';

import type { CareerMatch } from '@/types/career';
import { Tag, categoryColor } from '@/components/ui';

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

export interface CareerDetailProps {
  match: CareerMatch;
  /** slug → quizId, for "take the quiz" links. Built by the page. */
  quizBySkill?: Record<string, string>;
  /**
   * Whether to repeat the career's title in the body.
   *
   * False in the popup, where the Modal's own heading already says it, and
   * true in the card, whose header says "Where you're headed" instead.
   */
  showTitle?: boolean;
}

export function CareerDetail({ match, quizBySkill = {}, showTitle = true }: CareerDetailProps) {
  const { career } = match;

  // Certified wins over claimed: a quiz-proven skill is also in "my skills",
  // and the stronger provenance is the one worth showing.
  const certified = new Set(match.provenSkills);
  const claimed = new Set(match.claimedSkills);
  const statusOf = (slug: string): SkillStatus =>
    certified.has(slug) ? 'certified' : claimed.has(slug) ? 'claimed' : 'missing';

  // A claimed-but-uncertified skill is the better prompt than a missing one:
  // it's a quiz they can pass today, and it moves half credit to full. Only
  // once every claimed skill is certified does "learn something new" become
  // the next step. career.skills is heaviest-weight first, so taking the first
  // of each kind takes the most valuable one.
  const nextSkill =
    career.skills.find(
      (skill) => statusOf(skill.slug) === 'claimed' && quizBySkill[skill.slug],
    ) ??
    career.skills.find((skill) => statusOf(skill.slug) === 'claimed') ??
    match.missingSkills[0];
  const nextQuizId = nextSkill ? quizBySkill[nextSkill.slug] : undefined;

  return (
    <div>
      {showTitle && (
        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{career.title}</p>
      )}

      <p className={`${showTitle ? 'mt-0.5' : ''} text-sm text-zinc-600 dark:text-zinc-400`}>
        {/* The field shares its hue with every skill card in that category, so
            a career and the skills it needs read as one colour family. */}
        <span className={`font-medium ${categoryColor(career.field).text}`}>{career.field}</span>{' '}
        · {match.provenSkills.length} of {career.skills.length} skills proven
        {match.claimedSkills.length > 0 && `, ${match.claimedSkills.length} not yet proven`}
      </p>

      {career.description && (
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{career.description}</p>
      )}

      {career.skills.length > 0 && (
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
                  <span className={`h-2 w-2 rounded-full ${SKILL_STATUS[status].dot}`} aria-hidden />
                  {SKILL_STATUS[status].label}
                </li>
              ))}
            </ul>
          </div>

          <ul className="flex flex-wrap gap-2">
            {career.skills.map((skill) => {
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
    </div>
  );
}
