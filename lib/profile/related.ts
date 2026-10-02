// @/lib/profile/related.ts
// "Because you added X" — suggests skills from the vocabulary that go with the
// ones a student already has. No model call.
//
// The signal is co-occurrence in bundles the app already authors or ingests: a
// career archetype (data/careers.json → CareerSkill) and a job listing
// (JobSkill) are both weighted sets of skill slugs, which means "these two
// skills belong together" is already written down, 26 careers and every
// listing over. Two skills that keep turning up in the same bundles are
// related, and how *central* each is to its bundle says how strongly — so the
// same authored 1–5 weights that drive @/lib/careers/match and
// @/lib/jobs/match drive this too.
//
// Pure, and it scores the groups it is handed, so the bundles can come from
// the database without this file knowing about it — the same arrangement as
// the two matchers.

import type { SkillSource } from '@/types/profile';
import type { ProficiencyLevel } from '@/lib/quiz/levels';
import { creditFor } from '@/lib/profile/credit';

/** Weights are authored 1–5; dividing by the top of that scale keeps scores readable. */
const MAX_WEIGHT = 5;

/** A skill the student already has, and the evidence behind it. */
export interface HeldSkill {
  slug: string;
  name: string;
  source: SkillSource;
  /** The band a QUIZ-sourced skill was certified at. Grades its pull. */
  level?: ProficiencyLevel;
  /** Only read by the category fallback at the bottom of this file. */
  category?: string;
}

/** One weighted member of a bundle. */
export interface GroupSkill {
  slug: string;
  /** 1–5 importance to the group, the same scale as CareerSkill/JobSkill.weight. */
  weight: number;
}

/**
 * One bundle of skills that real work puts together — a career archetype or a
 * job listing. `kind` only chooses the wording of the reason on a card.
 */
export interface SkillGroup {
  kind: 'career' | 'job';
  /** Shown to the student, so an occupation or job title — never a slug. */
  label: string;
  skills: GroupSkill[];
}

/** A skill the student hasn't claimed, and so could be suggested. */
export interface CandidateSkill {
  slug: string;
  category?: string;
}

export interface SkillSuggestion {
  slug: string;
  /** Co-occurrence strength. Only meaningful for ordering. */
  score: number;
  /** One line saying why the card is here, e.g. "Pairs with SQL Fundamentals in Data Scientists". */
  reason: string;
}

export interface SuggestOptions {
  held: HeldSkill[];
  /** The unclaimed skills — the only ones worth suggesting. */
  candidates: CandidateSkill[];
  groups: SkillGroup[];
  limit?: number;
}

/** One reason a candidate could be shown: a held skill, met inside a group. */
interface Pair {
  contribution: number;
  heldName: string;
  group: SkillGroup;
}

/** Runners-up kept per candidate — enough to vary the shelf, cheap to carry. */
const PAIRS_KEPT = 3;

/**
 * How close to its best pair a runner-up must be before the shelf will print
 * it for the sake of variety.
 *
 * Without a floor, a card whose best career is already named above it reaches
 * for whatever is left, and "pairs with HTML & CSS in Technical Writers" is
 * true of the data but reads as a stretch — which costs more credibility than
 * naming one career twice costs in polish. Near-equal alternatives (a skill
 * central to both Web Developers and Web and Digital Interface Designers) sit
 * well inside the margin and still get used.
 */
const REASON_VARIETY_FLOOR = 0.75;

/**
 * Rank unclaimed skills by how strongly they travel with the student's own,
 * strongest first.
 *
 * A candidate scores for every bundle it shares with a held skill, and each
 * contribution is the product of the two weights — so two *core* skills of the
 * same career count for far more than two peripheral ones — times the credit
 * the held skill has earned. Summing over bundles is what lets a skill sitting
 * beside theirs in six careers outrank one that does so in a single listing;
 * dividing by how widely the candidate is asked for overall is what stops that
 * from just reprinting the most popular skills on the site.
 *
 * Candidates nothing connects to are filled in from the categories they
 * already work in, so a profile whose skills no bundle happens to pair still
 * gets a sensible shelf rather than a short one.
 */
export function suggestRelatedSkills({
  held,
  candidates,
  groups,
  limit = 6,
}: SuggestOptions): SkillSuggestion[] {
  if (limit <= 0 || held.length === 0 || candidates.length === 0) return [];

  const heldBySlug = new Map(held.map((skill) => [skill.slug, skill]));
  const candidateSlugs = new Set(candidates.map((skill) => skill.slug));

  // slug → running score, and the strongest few pairs behind it. A reason has
  // to name one specific pair to be worth reading, and the heaviest
  // contributor is the one the student will recognise — but a shelf built from
  // a sparse profile traces every card back through the same career, so the
  // runners-up are kept to spread the credit across it. See `reasonsFor`.
  const scores = new Map<string, number>();
  const pairs = new Map<string, Pair[]>();

  // How much each candidate is asked for *in total*, which divides its score
  // below. Counted over every group, including the ones the student has no
  // skill in, because that is exactly what the divisor has to measure.
  const demand = new Map<string, number>();
  for (const group of groups) {
    for (const member of group.skills) {
      if (!candidateSlugs.has(member.slug)) continue;
      demand.set(member.slug, (demand.get(member.slug) ?? 0) + member.weight / MAX_WEIGHT);
    }
  }

  for (const group of groups) {
    // Split once per group rather than per pair: a career lists ~10 skills, so
    // the loop below walks two short lists instead of rescanning the bundle.
    const heldInGroup: { skill: HeldSkill; weight: number }[] = [];
    const openInGroup: GroupSkill[] = [];

    for (const member of group.skills) {
      const owned = heldBySlug.get(member.slug);
      if (owned) heldInGroup.push({ skill: owned, weight: member.weight });
      else if (candidateSlugs.has(member.slug)) openInGroup.push(member);
    }

    if (heldInGroup.length === 0 || openInGroup.length === 0) continue;

    for (const candidate of openInGroup) {
      for (const { skill, weight } of heldInGroup) {
        const contribution =
          (weight / MAX_WEIGHT) * (candidate.weight / MAX_WEIGHT) * creditFor(skill);

        scores.set(candidate.slug, (scores.get(candidate.slug) ?? 0) + contribution);

        const pair = { contribution, heldName: skill.name, group };
        const kept = pairs.get(candidate.slug);
        if (kept) recordPair(kept, pair);
        else pairs.set(candidate.slug, [pair]);
      }
    }
  }

  const ranked = [...scores.entries()]
    // Divided by the square root of how widely the candidate is asked for, so
    // the shelf answers "what goes with *your* skills" rather than "what does
    // every job want". Without it, a skill in nearly every career (technical
    // writing, say) outscores the one specific neighbour the student actually
    // needs, purely by turning up more often. The square root rather than the
    // raw total because dividing it out fully overcorrects: a skill in wide
    // demand *and* next to theirs is a genuinely good suggestion, it just
    // shouldn't win on ubiquity alone.
    .map(([slug, score]) => [slug, score / Math.sqrt(demand.get(slug) ?? 1)] as const)
    .sort(([slugA, scoreA], [slugB, scoreB]) => scoreB - scoreA || slugA.localeCompare(slugB))
    .slice(0, limit);

  const reasons = reasonsFor(ranked.map(([slug]) => pairs.get(slug)!));
  const connected = ranked.map(([slug, score], index) => ({ slug, score, reason: reasons[index] }));

  if (connected.length >= limit) return connected;

  return [
    ...connected,
    ...byCategory({
      held,
      candidates,
      slots: limit - connected.length,
      // Everything the co-occurrence pass touched, not just what it returned:
      // a candidate it scored and then ranked below the cut was already judged
      // on the better signal, so the weaker one shouldn't resurrect it.
      exclude: new Set(scores.keys()),
    }),
  ];
}

/**
 * Keep `list` as the strongest `PAIRS_KEPT` pairs, at most one per group.
 *
 * One per group because the runners-up exist only to offer the shelf a
 * *different* line: three pairs from one career would all print the same group
 * name and defeat the point.
 */
function recordPair(list: Pair[], pair: Pair): void {
  const sameGroup = list.findIndex((kept) => kept.group.label === pair.group.label);

  if (sameGroup === -1) list.push(pair);
  else if (pair.contribution > list[sameGroup].contribution) list[sameGroup] = pair;
  else return;

  list.sort((a, b) => b.contribution - a.contribution);
  list.length = Math.min(list.length, PAIRS_KEPT);
}

/**
 * Choose the line each card shows, given every card's pairs in shelf order.
 *
 * A card takes its strongest pair whose group hasn't already been named above
 * it, so a student with two skills doesn't read "…in Web and Digital Interface
 * Designers" four times down the shelf — but only among pairs within
 * `REASON_VARIETY_FLOOR` of its best, so variety never buys a line the student
 * would read as wrong. This only picks the wording; ranking is already
 * settled. A card with no fresh pair close enough falls back to its strongest,
 * since a repeated line still beats both a misleading one and none at all.
 */
function reasonsFor(perCard: Pair[][]): string[] {
  const named = new Set<string>();

  return perCard.map((options) => {
    const floor = options[0].contribution * REASON_VARIETY_FLOOR;
    const fresh = options.find(
      (option) => option.contribution >= floor && !named.has(option.group.label),
    );

    const pick = fresh ?? options[0];
    named.add(pick.group.label);

    return pick.group.kind === 'career'
      ? `Pairs with ${pick.heldName} in ${pick.group.label}`
      : `Asked for with ${pick.heldName} in ${pick.group.label} listings`;
  });
}

/**
 * Fill the remaining slots from the categories the student already works in.
 *
 * Weaker than co-occurrence — sharing a category means two skills are the same
 * *kind* of thing, not that the same jobs want both — so these only ever land
 * after every connected candidate, and the reason says as much. Categories are
 * ranked by the credit banked in each, so the filler follows where the student
 * has actually put their effort.
 */
function byCategory({
  held,
  candidates,
  slots,
  exclude,
}: {
  held: HeldSkill[];
  candidates: CandidateSkill[];
  /** How many suggestions the co-occurrence pass left unfilled. */
  slots: number;
  /** Slugs that pass already accounted for, whether or not it returned them. */
  exclude: Set<string>;
}): SkillSuggestion[] {
  const creditByCategory = new Map<string, number>();
  const exampleByCategory = new Map<string, string>();

  for (const skill of held) {
    if (!skill.category) continue;
    const banked = creditByCategory.get(skill.category) ?? 0;
    creditByCategory.set(skill.category, banked + creditFor(skill));
    if (!exampleByCategory.has(skill.category)) exampleByCategory.set(skill.category, skill.name);
  }

  return candidates
    .filter(
      (candidate) =>
        !exclude.has(candidate.slug) &&
        candidate.category !== undefined &&
        creditByCategory.has(candidate.category),
    )
    .sort(
      (a, b) =>
        creditByCategory.get(b.category!)! - creditByCategory.get(a.category!)! ||
        a.slug.localeCompare(b.slug),
    )
    .slice(0, slots)
    .map((candidate) => ({
      slug: candidate.slug,
      score: 0,
      reason: `Same ${candidate.category} ground as ${exampleByCategory.get(candidate.category!)}`,
    }));
}
