// @/components/careers/CareerMatchCard.tsx
// "Where you're headed": the career archetype a student's skills point at.
//
// No model call behind this one — the scores come from @/lib/careers/match,
// which is arithmetic over the authored weights in data/careers.json. That's
// why it can render on page load while the AI job matches elsewhere wait for a
// button press.
//
// The body lives in ./CareerDetail, shared with the popup on the All careers
// list. This file is the header, the match percentage, and the alternates.

import type { CareerMatch } from '@/types/career';
import { Card, Tag } from '@/components/ui';
import { CareerDetail } from './CareerDetail';

export interface CareerMatchCardProps {
  /** Best fit first. The first is the headline; the rest render as alternates. */
  matches: CareerMatch[];
  /** slug → quizId, for "take the quiz" links. Built by the page. */
  quizBySkill?: Record<string, string>;
}

export function CareerMatchCard({ matches, quizBySkill = {} }: CareerMatchCardProps) {
  const [top, ...alternates] = matches;
  if (!top) return null;

  return (
    <Card
      title="Where you're headed"
      action={
        <Tag variant={top.score >= 70 ? 'success' : top.score >= 40 ? 'info' : 'neutral'}>
          {top.score}% match
        </Tag>
      }
    >
      <CareerDetail match={top} quizBySkill={quizBySkill} />

      {alternates.length > 0 && (
        <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-surface-border">
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
