// @/components/skills/SkillSection.tsx
// One labelled band of the skills board: heading, count, blurb, card grid.
//
// Server-safe (no hooks) — the interactivity lives in the callbacks the board
// threads through to each card.

import type { CatalogSkill } from '@/types/profile';
import { SkillCard } from './SkillCard';

export interface SkillSectionProps {
  title: string;
  /** One line under the heading saying what earns a card a place here. */
  blurb: string;
  skills: CatalogSkill[];
  /** Shown instead of the grid when `skills` is empty. */
  emptyMessage: string;
  onAdd?: (slug: string) => void;
  onRemove?: (slug: string) => void;
  /** Slugs with an add/remove in flight. */
  pendingSlugs?: Set<string>;
  /**
   * Whether claimed skills carry a "My skill" tag. Off for a section whose
   * heading already says it — see SkillCard's `showClaimedTag`.
   */
  showClaimedTag?: boolean;
}

export function SkillSection({
  title,
  blurb,
  skills,
  emptyMessage,
  onAdd,
  onRemove,
  pendingSlugs,
  showClaimedTag = true,
}: SkillSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {skills.length}
        </span>
        <p className="w-full text-sm text-zinc-600 dark:text-zinc-400">{blurb}</p>
      </header>

      {skills.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500 dark:border-surface-border dark:text-zinc-400">
          {emptyMessage}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => (
            <SkillCard
              key={skill.slug}
              skill={skill}
              onAdd={onAdd}
              onRemove={onRemove}
              pending={pendingSlugs?.has(skill.slug)}
              showClaimedTag={showClaimedTag}
            />
          ))}
        </div>
      )}
    </section>
  );
}
