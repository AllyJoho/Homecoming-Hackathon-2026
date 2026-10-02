'use client';

// @/components/skills/SkillCatalogBrowser.tsx
// The /skills tab: recommendations on top, then the whole vocabulary as one
// list.
//
// This replaces the four-section board that used to be the home screen. The
// sections were doing two jobs at once — telling you what you'd earned AND
// letting you manage the catalog — and splitting them moved the first job to
// home. What's left here is the catalog, so one flat grid is the honest shape:
// a skill's status rides on the card (SkillCard's StatusTag) instead of being
// implied by which band it sits in, which also means adding a skill no longer
// makes a card jump three sections up the page.
//
// Recommendations stay a section of their own because they are the one part
// that isn't just the vocabulary: they're ranked, they carry a reason, and
// they're the answer to "what should I add next".
//
// The server builds the catalog (prisma/queries.ts → listSkillCatalog); this
// owns the filters (./SkillFilters) and the optimistic add/remove.

import { useMemo, useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { CatalogSkill, SkillCatalog } from '@/types/profile';
import { SkillSection } from './SkillSection';
import {
  EMPTY_FILTERS,
  SkillFilters,
  applySkillFilters,
  hasActiveFilters,
  type SkillFilterState,
} from './SkillFilters';

export interface SkillCatalogBrowserProps {
  catalog: SkillCatalog;
}

/** A card moved between claimed and unclaimed, pending the server catching up. */
type Move = { slug: string; to: 'MINE' | 'AVAILABLE' };

export function SkillCatalogBrowser({ catalog }: SkillCatalogBrowserProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<SkillFilterState>(EMPTY_FILTERS);
  const [error, setError] = useState<string | null>(null);
  const [pendingSlugs, setPendingSlugs] = useState<Set<string>>(new Set());

  // useOptimistic rather than state plus an effect: the card holds its new
  // status for exactly as long as the transition runs, and React drops the
  // move once the refreshed server catalog has rendered — so there's no window
  // where a local override and the server disagree, and nothing to unwind by
  // hand when the request fails.
  const [sections, moveCard] = useOptimistic(catalog, (current: SkillCatalog, move: Move) =>
    rebucket(current, move),
  );
  const [, startTransition] = useTransition();

  // One list, in the category/name order the query already produced. Certified
  // and claimed skills are not floated to the top on purpose: this is the
  // vocabulary, and "what have I got" is home's question, not this page's.
  const all = useMemo(
    () => byCategoryThenName([...sections.certified, ...sections.mine, ...sections.available]),
    [sections],
  );

  const filtered = useMemo(() => applySkillFilters(all, filters), [all, filters]);

  // The shelf is every unclaimed skill the recommender ranked, so a status
  // filter makes no sense against it: "Certified" would empty it and "Not
  // added" would just restate it. Search and category still apply, so a
  // category filter narrows the shelf alongside the catalog.
  const statusFiltered = filters.status !== 'ALL';
  const recommended = useMemo(
    () => applySkillFilters(sections.recommended, { ...filters, status: 'ALL' }),
    [sections.recommended, filters],
  );
  const showShelf = sections.recommended.length > 0 && !statusFiltered;

  // The denominator is ALWAYS the whole vocabulary, shelf included. Deriving
  // it from what's currently rendered instead made the "All" pill count drop
  // from 46 to 40 the moment a status filter hid the shelf, which reads as the
  // catalog shrinking. The numerator does follow what's on screen, so a skill
  // on the shelf counts as a match while the shelf is visible.
  const everything = useMemo(
    () => [...all, ...sections.recommended],
    [all, sections.recommended],
  );
  const matches = filtered.length + (showShelf ? recommended.length : 0);

  function mutate(slug: string, action: 'add' | 'remove') {
    setError(null);
    setPendingSlugs((current) => new Set(current).add(slug));

    // One transition wraps the optimistic move, the request and the refresh:
    // that's what keeps the card in its new state until the authoritative
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

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <SkillFilters
          filters={filters}
          onChange={setFilters}
          skills={everything}
          matches={matches}
        />
        {error && (
          <p role="alert" className="text-xs text-red-700 dark:text-red-400">
            {error}
          </p>
        )}
      </div>

      {/* Only rendered once there's something to base it on: with no skills
          claimed, every suggestion would be arbitrary, and an empty shelf
          above the catalog is worse than no shelf. */}
      {showShelf && (
        <SkillSection
          title="Recommended for You"
          blurb="Goes with what you already have — the same careers and listings ask for both."
          skills={recommended}
          emptyMessage="No suggestions match these filters."
          onAdd={(slug) => mutate(slug, 'add')}
          pendingSlugs={pendingSlugs}
        />
      )}

      <SkillSection
        title="All skills"
        blurb="Add one to claim it, or jump straight to its quiz to certify it. Anything on the shelf above is listed there instead of here, so no skill appears twice."
        skills={filtered}
        emptyMessage={
          hasActiveFilters(filters)
            ? 'No skills match these filters.'
            : 'No skills in the catalog yet.'
        }
        onAdd={(slug) => mutate(slug, 'add')}
        onRemove={(slug) => mutate(slug, 'remove')}
        pendingSlugs={pendingSlugs}
      />
    </div>
  );
}

/**
 * Move one card between claimed and unclaimed.
 *
 * The certified bucket is never touched: the only transition a user can
 * trigger from this page is between claimed and unclaimed, and certification
 * is earned by passing a quiz.
 *
 * Recommendations are a slice of the unclaimed skills, so a card that leaves
 * "my skills" belongs back on the shelf it was promoted onto — that's what
 * `wasRecommended` is for. The server re-ranks on the refresh that ends the
 * transition, which is what gets a newly added skill's own neighbours onto the
 * shelf.
 */
function rebucket(catalog: SkillCatalog, move: Move): SkillCatalog {
  const wasRecommended = new Set(catalog.recommended.map((skill) => skill.slug));

  const mine: CatalogSkill[] = [];
  const recommended: CatalogSkill[] = [];
  const available: CatalogSkill[] = [];

  for (const skill of [...catalog.mine, ...catalog.recommended, ...catalog.available]) {
    const status = skill.slug === move.slug ? move.to : skill.status;

    if (status === 'MINE') {
      mine.push({ ...skill, status: 'MINE' });
    } else if (wasRecommended.has(skill.slug)) {
      recommended.push({ ...skill, status: 'AVAILABLE' });
    } else {
      available.push({ ...skill, status: 'AVAILABLE' });
    }
  }

  return {
    certified: catalog.certified,
    mine: byCategoryThenName(mine),
    // The shelf keeps the recommender's ranking, which is not alphabetical —
    // re-sorting it would throw away the "strongest first" ordering.
    recommended,
    available: byCategoryThenName(available),
  };
}

function byCategoryThenName(skills: CatalogSkill[]): CatalogSkill[] {
  return [...skills].sort(
    (a, b) => (a.category ?? '').localeCompare(b.category ?? '') || a.name.localeCompare(b.name),
  );
}
