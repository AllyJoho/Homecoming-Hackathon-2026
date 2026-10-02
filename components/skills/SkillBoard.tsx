'use client';

// @/components/skills/SkillBoard.tsx
// The three-section skills board: Certified Skills, My Skills, Skills.
//
// The server builds the catalog (prisma/queries.ts → listSkillCatalog) and
// this component owns only two things on top of it: the search filter, and the
// optimistic move of a card between "My skills" and "Skills" while the
// add/remove request is still in flight.

import { useMemo, useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { CatalogSkill, SkillCatalog } from '@/types/profile';
import { SkillSection } from './SkillSection';

export interface SkillBoardProps {
  catalog: SkillCatalog;
}

/** A card moved between sections, pending the server catching up. */
type Move = { slug: string; to: 'MINE' | 'AVAILABLE' };

export function SkillBoard({ catalog }: SkillBoardProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendingSlugs, setPendingSlugs] = useState<Set<string>>(new Set());

  // useOptimistic rather than plain state plus an effect: the moved card holds
  // its new section for exactly as long as the transition below runs, and React
  // drops the move once the refreshed server catalog has rendered — so there's
  // no window where a local override and the server's buckets disagree, and
  // nothing to unwind by hand when the request fails.
  const [sections, moveCard] = useOptimistic(catalog, (current: SkillCatalog, move: Move) =>
    rebucket(current, move),
  );
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => filterCatalog(sections, query), [sections, query]);

  function mutate(slug: string, action: 'add' | 'remove') {
    setError(null);
    setPendingSlugs((current) => new Set(current).add(slug));

    // One transition wraps the optimistic move, the request and the refresh:
    // that's what keeps the card in its new section until the authoritative
    // catalog is on screen.
    startTransition(async () => {
      moveCard({ slug, to: action === 'add' ? 'MINE' : 'AVAILABLE' });

      try {
        const response =
          action === 'add'
            ? await fetch('/api/skills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // The route normalizes through the canonical vocabulary, and an
                // exact slug resolves to itself — see normalizeSkill.
                body: JSON.stringify({ skill: slug }),
              })
            : await fetch(`/api/skills?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? 'Could not save that change.');
        }

        router.refresh();
      } catch (caught) {
        // No rollback needed — ending the transition without a refresh drops
        // the optimistic move on its own.
        setError(caught instanceof Error ? caught.message : 'Something went wrong.');
      } finally {
        setPendingSlugs((current) => {
          const next = new Set(current);
          next.delete(slug);
          return next;
        });
      }
    });
  }

  const total = sections.certified.length + sections.mine.length + sections.available.length;
  const matches = filtered.certified.length + filtered.mine.length + filtered.available.length;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search skills — name, category, or description"
          aria-label="Search skills"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-50"
        />
        {query.trim() && (
          <p aria-live="polite" className="text-xs text-zinc-500 dark:text-zinc-400">
            {matches} of {total} skills match “{query.trim()}”
          </p>
        )}
        {error && (
          <p role="alert" className="text-xs text-red-700 dark:text-red-400">
            {error}
          </p>
        )}
      </div>

      <SkillSection
        title="Certified Skills"
        blurb="Proven — you passed the quiz. Job matches weight these highest."
        skills={filtered.certified}
        emptyMessage={
          query.trim()
            ? 'No certified skills match your search.'
            : 'Nothing certified yet. Pass a quiz and the skill moves up here.'
        }
      />

      <SkillSection
        title="My Skills"
        blurb="Your interests and experience, claimed but not yet certified."
        skills={filtered.mine}
        emptyMessage={
          query.trim()
            ? 'No skills of yours match your search.'
            : 'Add skills from below to show what you’re into.'
        }
        onRemove={(slug) => mutate(slug, 'remove')}
        pendingSlugs={pendingSlugs}
      />

      <SkillSection
        title="Skills"
        blurb="Everything else on the site. Add one to claim it, or jump straight to its quiz."
        skills={filtered.available}
        emptyMessage={
          query.trim()
            ? 'No remaining skills match your search.'
            : 'You’ve claimed every skill we track. Go prove a few.'
        }
        onAdd={(slug) => mutate(slug, 'add')}
        pendingSlugs={pendingSlugs}
      />
    </div>
  );
}

/**
 * Move one card between "My Skills" and "Skills". The certified section is
 * never touched: the only transition a user can trigger from this board is
 * between those two, and certification is earned by passing a quiz.
 */
// Note: this component is no longer mounted — /skills renders
// SkillCatalogBrowser, which is where the recommended shelf lives. The two
// `recommended` lines below exist only so the file still typechecks against
// SkillCatalog; it carries no shelf of its own.
function rebucket(catalog: SkillCatalog, move: Move): SkillCatalog {
  const mine: CatalogSkill[] = [];
  const available: CatalogSkill[] = [];

  for (const skill of [...catalog.mine, ...catalog.available]) {
    const status = skill.slug === move.slug ? move.to : skill.status;
    if (status === 'MINE') mine.push({ ...skill, status: 'MINE' });
    else available.push({ ...skill, status: 'AVAILABLE' });
  }

  // Both lists came in sorted by category then name; merging them breaks that,
  // so restore it rather than letting a moved card land at the seam.
  return {
    certified: catalog.certified,
    mine: byCategoryThenName(mine),
    recommended: catalog.recommended,
    available: byCategoryThenName(available),
  };
}

function byCategoryThenName(skills: CatalogSkill[]): CatalogSkill[] {
  return [...skills].sort(
    (a, b) =>
      (a.category ?? '').localeCompare(b.category ?? '') || a.name.localeCompare(b.name),
  );
}

function filterCatalog(catalog: SkillCatalog, query: string): SkillCatalog {
  const needle = query.trim().toLowerCase();
  if (!needle) return catalog;

  const match = (skill: CatalogSkill) =>
    `${skill.name} ${skill.category ?? ''} ${skill.description ?? ''}`
      .toLowerCase()
      .includes(needle);

  return {
    certified: catalog.certified.filter(match),
    mine: catalog.mine.filter(match),
    recommended: catalog.recommended.filter(match),
    available: catalog.available.filter(match),
  };
}
