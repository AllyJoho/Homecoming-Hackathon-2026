// @/components/careers/CareerList.tsx
// Every career archetype, ranked against the student's profile.
//
// The headline match gets CareerMatchCard; this is the long tail underneath
// it — the point being that a 12% match is still information ("here's what
// that direction would take"), so the list doesn't stop at the good ones.

import type { CareerMatch } from '@/types/career';
import { Card, Tag, GROUP_HEADING, categoryColor } from '@/components/ui';

export interface CareerListProps {
  matches: CareerMatch[];
  title?: string;
}

export function CareerList({ matches, title = 'All careers' }: CareerListProps) {
  if (matches.length === 0) return null;

  return (
    <Card title={title} subtitle={`${matches.length} tracked, closest first`} flush>
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {matches.map((match) => (
          <li key={match.career.slug} className="flex items-center gap-4 px-5 py-3">
            {/* Fixed-width so the bars line up into a readable column. */}
            <div className="flex w-14 shrink-0 items-center justify-end">
              <span className="text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                {match.score}%
              </span>
            </div>

            <div
              className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
              aria-hidden
            >
              {/* The bar takes the field's hue, so a glance down the list
                  groups careers by field as well as ranking them. */}
              <div
                className={`h-full rounded-full ${categoryColor(match.career.field).dot}`}
                style={{ width: `${match.score}%` }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-zinc-900 dark:text-zinc-50">
                {match.career.title}
              </p>
              <p
                className={`${GROUP_HEADING} mt-0.5 normal-case ${categoryColor(match.career.field).text}`}
              >
                {match.career.field}
              </p>
            </div>

            <div className="shrink-0">
              {match.provenSkills.length > 0 ? (
                <Tag variant="success">{match.provenSkills.length} proven</Tag>
              ) : (
                <Tag variant="neutral">{match.missingSkills.length} to learn</Tag>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
