'use client';

// @/components/careers/CareerList.tsx
// Every career archetype, ranked against the student's profile.
//
// The headline match gets CareerMatchCard; this is the long tail underneath
// it — the point being that a 12% match is still information ("here's what
// that direction would take"), so the list doesn't stop at the good ones.
//
// Each row opens a popup with the same detail the headline card shows, via the
// shared ./CareerDetail. That's the whole reason the list can stay one line
// per career: the row carries the ranking, and the popup carries the
// explanation, so neither has to compromise.
//
// A client component only for the popup's open/closed state. Everything it
// renders was computed on the server by @/lib/careers/match.

import { useState } from 'react';

import type { CareerMatch } from '@/types/career';
import { Card, Modal, Tag, GROUP_HEADING, categoryColor } from '@/components/ui';
import { CareerDetail } from './CareerDetail';

export interface CareerListProps {
  matches: CareerMatch[];
  /** slug → quizId, so the popup's skill chips can link to their quiz. */
  quizBySkill?: Record<string, string>;
  title?: string;
}

export function CareerList({ matches, quizBySkill = {}, title = 'All careers' }: CareerListProps) {
  // The whole match, not an index: the list is re-sorted whenever the profile
  // changes, and an index would open the wrong career after a refresh.
  const [selected, setSelected] = useState<CareerMatch | null>(null);

  if (matches.length === 0) return null;

  return (
    <>
      <Card title={title} subtitle={`${matches.length} tracked, closest first — tap one for detail`} flush>
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {matches.map((match) => (
            <li key={match.career.slug}>
              {/* A real button, not a div with onClick: this has to be
                  reachable and operable from the keyboard, and the row is the
                  hit target rather than the title alone. */}
              <button
                type="button"
                onClick={() => setSelected(match)}
                aria-haspopup="dialog"
                className="flex w-full cursor-pointer items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none dark:hover:bg-zinc-900 dark:focus-visible:bg-zinc-900"
              >
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
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.career.title}
      >
        {selected && (
          <div className="flex flex-col gap-3">
            {/* The score lives here rather than in CareerDetail because the
                card puts it in its own header — the detail body is shared, the
                chrome around it isn't. */}
            <div>
              <Tag
                variant={
                  selected.score >= 70 ? 'success' : selected.score >= 40 ? 'info' : 'neutral'
                }
              >
                {selected.score}% match
              </Tag>
            </div>

            {/* showTitle=false: the Modal's own heading already says it. */}
            <CareerDetail match={selected} quizBySkill={quizBySkill} showTitle={false} />
          </div>
        )}
      </Modal>
    </>
  );
}
