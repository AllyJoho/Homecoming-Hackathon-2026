'use client';

// @/components/skills/SkillFilters.tsx
// Search, status and category for the skills catalog.
//
// The catalog is 46 skills in one flat grid, which is the right shape for
// "what is there" but makes "show me just my certified ones" a scrolling
// exercise — the old three-section board answered that by construction, and
// flattening it took the answer away. These filters put it back without
// bringing the sections back.
//
// Status is pills and category is a select, which is deliberate rather than
// inconsistent: four short, mutually exclusive states are worth making
// one-click and visible, while seven long category names would wrap into three
// rows of buttons on a phone.
//
// Categories are derived from the cards passed in, never hardcoded — a new
// category in data/skills.json appears here on its own.

import type { CatalogSkill, SkillStatus } from '@/types/profile';
import { Button, SelectField, GROUP_HEADING } from '@/components/ui';

/** 'ALL' plus the three card statuses. */
export type StatusFilter = 'ALL' | SkillStatus;

export interface SkillFilterState {
  query: string;
  status: StatusFilter;
  /** A category name, or 'ALL'. */
  category: string;
}

export const EMPTY_FILTERS: SkillFilterState = {
  query: '',
  status: 'ALL',
  category: 'ALL',
};

export function hasActiveFilters(filters: SkillFilterState): boolean {
  return (
    filters.query.trim() !== '' || filters.status !== 'ALL' || filters.category !== 'ALL'
  );
}

/**
 * Status labels.
 *
 * "Claimed" rather than "Self-reported" because MINE now covers both a skill
 * typed in and one a pasted resume evidenced — @/prisma/queries buckets
 * anything that isn't QUIZ-sourced here. The matcher does tell those apart
 * (CREDIT in @/lib/jobs/match), but a card doesn't carry its source yet, so
 * the filter can't honestly split them.
 */
const STATUSES: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'CERTIFIED', label: 'Certified' },
  { value: 'MINE', label: 'Claimed' },
  { value: 'AVAILABLE', label: 'Not added' },
];

export interface SkillFiltersProps {
  filters: SkillFilterState;
  onChange: (filters: SkillFilterState) => void;
  /** Every card on the page, for deriving the category list and the counts. */
  skills: CatalogSkill[];
  /** How many cards survive the current filters. */
  matches: number;
}

export function SkillFilters({ filters, onChange, skills, matches }: SkillFiltersProps) {
  const categories = [...new Set(skills.map((skill) => skill.category).filter(Boolean))].sort() as string[];

  // Per-status counts, so the pills say how much is behind them rather than
  // making someone click to find out one of them is empty.
  const counts = skills.reduce<Record<string, number>>((acc, skill) => {
    acc[skill.status] = (acc[skill.status] ?? 0) + 1;
    return acc;
  }, {});

  const set = (patch: Partial<SkillFilterState>) => onChange({ ...filters, ...patch });
  const active = hasActiveFilters(filters);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={filters.query}
        onChange={(event) => set({ query: event.target.value })}
        placeholder="Search skills — name, category, or description"
        aria-label="Search skills"
        // bg-white explicitly: the page is tinted, and an input with no fill
        // would take the tint and stop reading as something you type in.
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-surface-border dark:bg-surface dark:focus:border-zinc-50"
      />

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1.5">
          <span className={GROUP_HEADING} id="skill-status-label">
            Status
          </span>
          {/* A radio group, not a set of toggles: exactly one status applies. */}
          <div role="radiogroup" aria-labelledby="skill-status-label" className="flex flex-wrap gap-1.5">
            {STATUSES.map(({ value, label }) => {
              const selected = filters.status === value;
              const count = value === 'ALL' ? skills.length : (counts[value] ?? 0);

              return (
                <Button
                  key={value}
                  size="xs"
                  variant={selected ? 'primary' : 'secondary'}
                  role="radio"
                  aria-checked={selected}
                  // An empty bucket is worth showing greyed rather than
                  // hiding — "no certified skills yet" is information.
                  disabled={count === 0 && value !== 'ALL'}
                  onClick={() => set({ status: value })}
                >
                  {label}
                  <span className="opacity-60">{count}</span>
                </Button>
              );
            })}
          </div>
        </div>

        <div className="min-w-[14rem]">
          <SelectField
            label="Category"
            value={filters.category}
            onChange={(event) => set({ category: event.target.value })}
            options={[
              { value: 'ALL', label: `All categories (${skills.length})` },
              ...categories.map((category) => ({
                value: category,
                label: `${category} (${skills.filter((s) => s.category === category).length})`,
              })),
            ]}
          />
        </div>

        {active && (
          <Button size="xs" variant="ghost" onClick={() => onChange(EMPTY_FILTERS)}>
            Clear filters
          </Button>
        )}
      </div>

      {active && (
        <p aria-live="polite" className="text-xs text-zinc-500 dark:text-zinc-400">
          {matches === 0
            ? 'No skills match these filters.'
            : `Showing ${matches} of ${skills.length} skills.`}
        </p>
      )}
    </div>
  );
}

/** Apply the filter state to a list of cards. Pure, so it's easy to reason about. */
export function applySkillFilters(
  skills: CatalogSkill[],
  filters: SkillFilterState,
): CatalogSkill[] {
  const needle = filters.query.trim().toLowerCase();

  return skills.filter((skill) => {
    if (filters.status !== 'ALL' && skill.status !== filters.status) return false;
    if (filters.category !== 'ALL' && skill.category !== filters.category) return false;
    if (!needle) return true;

    return `${skill.name} ${skill.category ?? ''} ${skill.description ?? ''}`
      .toLowerCase()
      .includes(needle);
  });
}
