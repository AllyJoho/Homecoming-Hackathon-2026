// @/components/skills/SkillCard.tsx
// One skill as a tile in the grid. Every list that shows skills renders this
// same card; `skill.status` decides the status tag and which actions appear.
//
// Not built on @/components/ui/Card: that surface puts every title in its own
// bordered header, which reads as heavy at forty-odd tiles. This reuses Card's
// border/radius/background tokens so the two still look like one system.

import Link from 'next/link';
import type { CatalogSkill } from '@/types/profile';
import { Button, Tag, categoryColor } from '@/components/ui';

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
  /**
   * Whether to tag a claimed skill as "My skill". False under a heading that
   * already says so — home's "My Skills" section, where the tag would just
   * repeat the words directly above it.
   *
   * Only the claimed tag is suppressible: the certified one carries the LEVEL,
   * which no heading states, so it stays worth showing everywhere.
   */
  showClaimedTag?: boolean;
}

// The left edge carries the skill's CATEGORY, not its status — status is the
// top-right tag's job (see StatusTag), and the actions differ per status too
// (Remove vs + Add vs View certificate). Category was the thing you couldn't
// see, and since cards are sorted by category, colouring the edge turns the
// grid into readable colour runs.
//
// categoryColor's `stripe` carries `!` because `hover:border-zinc-300` below is
// the border-color SHORTHAND, which Tailwind emits after every
// border-left-color rule — without it the accent vanished on hover, exactly
// when the user was looking at the card.

export function SkillCard({
  skill,
  onAdd,
  onRemove,
  pending,
  showClaimedTag = true,
}: SkillCardProps) {
  const color = categoryColor(skill.category);

  return (
    <article
      className={`flex flex-col gap-3 rounded-xl border border-l-4 border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 ${color.stripe}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{skill.name}</h3>
        <StatusTag skill={skill} showClaimedTag={showClaimedTag} />
      </div>

      {skill.category && (
        <p className={`text-xs font-medium tracking-wide uppercase ${color.text}`}>
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

      {/* Only a suggestion carries a reason, and a suggestion without one would
          be a card asking to be trusted for no stated cause — so this line is
          the point of the recommended shelf rather than decoration on it. A
          left rule instead of a tinted box: the card already has a coloured
          edge and a tag, and a third filled surface made the tile shouty. */}
      {skill.reason && (
        <p className="border-l-2 border-zinc-200 pl-2 text-xs leading-relaxed text-zinc-500 italic dark:border-zinc-700 dark:text-zinc-400">
          {skill.reason}
        </p>
      )}

      {/* mt-auto pins the actions to the bottom, so they line up across a row
          of cards whose descriptions are different lengths. */}
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
        <SkillCardActions skill={skill} onAdd={onAdd} onRemove={onRemove} pending={pending} />
      </div>
    </article>
  );
}

/**
 * Where the student stands on this skill, top-right of the card.
 *
 * This is the one piece of status the card can't get from its surroundings:
 * the catalog on /skills is a single flat list, so unlike the old sectioned
 * board there is no heading above a card saying which bucket it is in.
 *
 * Certified shows the LEVEL rather than the score, because the level is what
 * the certificate says and what a student would tell someone — the percentage
 * is the arithmetic behind it, so it rides along in the tooltip.
 */
function StatusTag({ skill, showClaimedTag }: { skill: CatalogSkill; showClaimedTag: boolean }) {
  switch (skill.status) {
    case 'CERTIFIED':
      return (
        // Wrapped rather than passing `title` to Tag: the primitive takes no
        // title prop, and widening it for one tooltip isn't worth it.
        <span
          className="shrink-0"
          title={
            skill.score !== undefined
              ? `Certified at ${skill.level ?? 'a level'} — ${skill.score}% on the quiz`
              : 'Certified'
          }
        >
          {/* A certification row should always carry a level, but the card is
              read off the UserSkill source, which can be QUIZ with the cert
              row missing — so this degrades to plain "Certified". */}
          <Tag variant="success">{skill.level ? `✓ ${skill.level}` : '✓ Certified'}</Tag>
        </span>
      );

    case 'MINE':
      return showClaimedTag ? (
        <span className="shrink-0" title="You claimed this — pass the quiz to certify it">
          <Tag variant="info">My skill</Tag>
        </span>
      ) : null;

    // Unclaimed needs no tag: the card's "+ Add" button already says what it
    // is, and a grey "not yours" pill on two thirds of the grid is noise.
    case 'AVAILABLE':
      return null;
  }
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
    // Say so rather than rendering a dead link for any future skill that has
    // not received a quiz bank yet.
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
