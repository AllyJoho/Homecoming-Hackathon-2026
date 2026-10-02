// @/components/skills/SkillCard.tsx
// One skill as a tile in the grid. The three sections of the board render the
// same card; `skill.status` decides the accent and which actions appear.
//
// Not built on @/components/ui/Card: that surface puts every title in its own
// bordered header, which reads as heavy at forty-odd tiles. This reuses Card's
// border/radius/background tokens so the two still look like one system.

import Link from 'next/link';
import type { CatalogSkill } from '@/types/profile';
import { Button, Tag } from '@/components/ui';

export interface SkillCardProps {
  skill: CatalogSkill;
  /** Add to "My skills". Omitted on cards that have nothing to add. */
  onAdd?: (slug: string) => void;
  /** Drop a self-reported claim. Never passed for a certified skill. */
  onRemove?: (slug: string) => void;
  /**
   * An add/remove for this slug is in flight. The card has already moved
   * section optimistically, so this only guards against a second click on the
   * same skill before the first request lands.
   */
  pending?: boolean;
}

// Left edge accent, so the section a card belongs to is readable even once
// it's been scrolled away from its heading.
const ACCENTS: Record<CatalogSkill['status'], string> = {
  CERTIFIED: 'border-l-4 border-l-emerald-500 dark:border-l-emerald-400',
  MINE: 'border-l-4 border-l-sky-500 dark:border-l-sky-400',
  AVAILABLE: 'border-l-4 border-l-transparent',
};

export function SkillCard({ skill, onAdd, onRemove, pending }: SkillCardProps) {
  return (
    <article
      className={`flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 ${ACCENTS[skill.status]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{skill.name}</h3>
        {skill.status === 'CERTIFIED' && skill.score !== undefined && (
          <Tag tone="success" className="shrink-0">
            ✓ {skill.score}%
          </Tag>
        )}
      </div>

      {skill.category && (
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-500">
          {skill.category}
        </p>
      )}

      {skill.description && (
        // Clamped so a long description can't make one tile twice the height
        // of its row neighbours.
        <p className="line-clamp-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          {skill.description}
        </p>
      )}

      {/* mt-auto pins the actions to the bottom, so they line up across a row
          of cards whose descriptions are different lengths. */}
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
        <SkillCardActions
          skill={skill}
          onAdd={onAdd}
          onRemove={onRemove}
          pending={pending}
        />
      </div>
    </article>
  );
}

function SkillCardActions({ skill, onAdd, onRemove, pending }: SkillCardProps) {
  const quizLink = skill.quizId ? (
    <Link
      href={`/quizzes/${skill.quizId}`}
      className="text-xs font-medium underline underline-offset-4 hover:no-underline"
    >
      {skill.status === 'CERTIFIED' ? 'Retake quiz' : 'Take the quiz'}
    </Link>
  ) : (
    // Says so rather than rendering a dead link: most of the vocabulary has no
    // authored quiz yet, and "certify" has to mean something.
    <span className="text-xs text-zinc-400 dark:text-zinc-600">Quiz coming soon</span>
  );

  switch (skill.status) {
    case 'CERTIFIED':
      return (
        <>
          {skill.shareSlug && (
            <Link
              href={`/certificates/${skill.shareSlug}`}
              className="text-xs font-medium text-emerald-700 underline underline-offset-4 hover:no-underline dark:text-emerald-400"
            >
              View certificate
            </Link>
          )}
          {quizLink}
        </>
      );

    case 'MINE':
      return (
        <>
          {quizLink}
          {onRemove && (
            <Button
              size="xs"
              variant="ghost"
              disabled={pending}
              onClick={() => onRemove(skill.slug)}
              className="ml-auto"
            >
              Remove
            </Button>
          )}
        </>
      );

    case 'AVAILABLE':
      return (
        <>
          {onAdd && (
            <Button
              size="xs"
              variant="secondary"
              disabled={pending}
              onClick={() => onAdd(skill.slug)}
            >
              + Add
            </Button>
          )}
          {quizLink}
        </>
      );
  }
}
