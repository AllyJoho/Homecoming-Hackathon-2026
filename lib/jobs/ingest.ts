// @/lib/jobs/ingest.ts
// Turns listings from a job board into rows this app can match against.
//
// The pipeline, and why it's in this order:
//
//   1. fetch       — the source hands over everything it has
//   2. pre-filter  — drop what obviously isn't in our vocabulary. FREE, and it
//                    is what keeps the AI bill proportional to useful work:
//                    a board is mostly sales and ops roles.
//   3. extract     — one AI call per surviving listing, mapping its prose onto
//                    canonical skill slugs. The expensive step.
//   4. validate    — keep only slugs that really exist; a hallucinated one
//                    would break the quiz links downstream.
//   5. upsert      — write it. Listings already stored are skipped before
//                    step 3, so a listing is extracted ONCE EVER.
//
// Step 5 is why this is a script and a POST route rather than something a page
// render does: the result is durable, so the cost is paid once and every later
// page load is a plain database read.

import { z } from 'zod';

import { CANONICAL_SKILLS, skillBySlug } from '@/lib/profile/skills';
import { AiError, generateObject } from '@/lib/ai/provider';
import { buildExtractionSystemPrompt, buildExtractionUserMessage } from '@/lib/ai/prompts';
import { greenhouseSource } from '@/lib/jobs/sources/greenhouse';
import type { JobSource, RawListing } from '@/lib/jobs/sources/types';
import { listJobIds, upsertJob } from '@/prisma/queries';

const ExtractedSkillSchema = z.object({
  slug: z.string().describe('A slug from the vocabulary, copied exactly'),
  weight: z.number().min(1).max(5).describe('1-5, how central this skill is to the role'),
  required: z.boolean().describe('true for a must-have, false for a nice-to-have'),
});

const ExtractionSchema = z.object({
  level: z.enum(['internship', 'entry', 'mid', 'senior']),
  skills: z.array(ExtractedSkillSchema),
  salaryRange: z.string().optional(),
});

/**
 * Departments and title words that never map onto this vocabulary.
 *
 * A blocklist rather than an allowlist on purpose: an allowlist silently drops
 * roles we'd have wanted (every board names things differently), while a bad
 * blocklist entry only costs one wasted extraction. Anything that survives
 * this still has to produce at least one real skill in step 4, so the AI is
 * the actual relevance test — this just stops us paying to be told "no".
 */
const BLOCKED = [
  'sales',
  'account executive',
  'account manager',
  'business development',
  'recruit',
  'talent acquisition',
  'office manager',
  'executive assistant',
  'accounting',
  'accounts payable',
  'payroll',
  'legal counsel',
  'paralegal',
  'facilities',
  'warehouse',
  'clinical',
  'laboratory',
  'scientist, ',
  'chemist',
  'general application',
];

function isPlausible(listing: RawListing): boolean {
  const haystack = `${listing.title} ${listing.department ?? ''}`.toLowerCase();
  if (BLOCKED.some((term) => haystack.includes(term))) return false;
  // A listing with no description has nothing for step 3 to read.
  return listing.description.length >= 200;
}

/** Guard against a pathological description blowing up one call's input. */
const MAX_DESCRIPTION_CHARS = 12_000;

/**
 * Most required skills a real listing can plausibly have.
 *
 * Not a style preference — a correctness guard. A weak model asked to pick
 * from a 46-item vocabulary sometimes returns most of it: mistral tagged a
 * "Tax Operations Intern" with 37 required skills. A row like that matches
 * everyone and outranks honest listings, quietly poisoning every ranking that
 * follows. Measured against good extractions, the real ceiling is 6.
 *
 * Enforced for every provider, not just local ones. The database shouldn't
 * depend on which model happened to be configured.
 */
const MAX_REQUIRED_SKILLS = 12;

/** Locations worth surfacing first for a BYU audience. */
const LOCAL = /\b(utah|ut|provo|orem|lehi|draper|sandy|american fork|pleasant grove|salt lake|slc)\b/i;

/**
 * How well a listing suits the students using this app. Higher goes first.
 *
 * This exists because the boards return far more listings than we extract —
 * ~1600 fetched against a limit of 25 — so whatever order they arrive in
 * decides what the app actually contains. Unsorted, that's mostly senior
 * postings, which is the wrong product: nobody here is hiring a student as a
 * Principal Engineer.
 *
 * Title-matching, so it's free and runs before any model call. It only picks
 * which listings are worth extracting; the model still decides the real level.
 */
function studentFit(listing: RawListing): number {
  const title = listing.title;
  const local = LOCAL.test(listing.location) ? 0.5 : 0;

  // An internship is the single most useful thing we can show a student.
  if (/\b(intern|internship|co-?op|apprentice)\b/i.test(title)) return 4 + local;
  if (/\b(new.?grad|university|early.?career|campus|rotational)\b/i.test(title)) return 3 + local;
  if (/\b(junior|jr\.?|entry.?level)\b/i.test(title)) return 2 + local;
  if (/\bassociate\b/i.test(title)) return 1 + local;

  // Still worth storing — a student should see what's above them — but last
  // in line for the extraction budget.
  if (/\b(senior|sr\.?|staff|principal|lead|director|head of|vp|chief|architect|manager)\b/i.test(title)) {
    return -1 + local;
  }
  return local;
}

export interface IngestResult {
  fetched: number;
  alreadyStored: number;
  filteredOut: number;
  extracted: number;
  /** Extracted fine but matched no skill in our vocabulary — correctly dropped. */
  irrelevant: number;
  failed: number;
  stored: string[];
}

export interface IngestOptions {
  source?: JobSource;
  /**
   * Stop after this many *new* listings are stored. The reason this exists:
   * extraction against a local model runs ~30s per listing, so an unbounded
   * run is a 50-minute run.
   */
  limit?: number;
  /** Called after each listing, for progress output in a long script. */
  onProgress?: (message: string) => void;
  /**
   * Re-extract listings already stored instead of skipping them.
   *
   * Normally skipping is the whole economy of this pipeline — a listing is
   * extracted once ever. Refresh exists for the case where the extraction
   * itself changed: new fields in the schema, a reworked prompt, or rows that
   * predate a change and are sitting on default values. It re-spends the model
   * cost for every listing it touches, so it is opt-in and not the default.
   */
  refresh?: boolean;
}

export async function ingestJobs({
  source = greenhouseSource(),
  limit = 25,
  onProgress,
  refresh = false,
}: IngestOptions = {}): Promise<IngestResult> {
  const report = (message: string) => onProgress?.(message);

  const listings = await source.fetchListings();
  const known = new Set(await listJobIds());

  const result: IngestResult = {
    fetched: listings.length,
    alreadyStored: 0,
    filteredOut: 0,
    extracted: 0,
    irrelevant: 0,
    failed: 0,
    stored: [],
  };

  // The vocabulary is identical for every listing, so build the system prompt
  // once rather than per call.
  const system = buildExtractionSystemPrompt(CANONICAL_SKILLS);

  const queue: RawListing[] = [];
  for (const listing of listings) {
    if (known.has(listing.id) && !refresh) {
      result.alreadyStored += 1;
    } else if (!isPlausible(listing)) {
      result.filteredOut += 1;
    } else {
      queue.push(listing);
    }
  }

  // Best-fit first, so a small limit spends the budget on the listings a
  // student can actually apply to. On a refresh, already-stored listings come
  // first — they're the ones whose data is stale.
  queue.sort((a, b) => {
    if (refresh) {
      const stored = Number(known.has(b.id)) - Number(known.has(a.id));
      if (stored !== 0) return stored;
    }
    return studentFit(b) - studentFit(a);
  });

  report(
    `${result.fetched} fetched · ${result.alreadyStored} already stored · ${result.filteredOut} filtered out · ${queue.length} candidates, extracting up to ${limit} (most student-appropriate first)`,
  );

  // Sequential, not parallel: a local model serves one request at a time
  // anyway, and against the API this keeps a long run under the rate limit
  // without any backoff logic.
  for (const listing of queue) {
    if (result.stored.length >= limit) break;

    let extracted;
    try {
      extracted = await generateObject({
        task: 'job-skill-extraction',
        system,
        prompt: buildExtractionUserMessage({
          ...listing,
          description: listing.description.slice(0, MAX_DESCRIPTION_CHARS),
        }),
        schema: ExtractionSchema,
      });
    } catch (error) {
      result.failed += 1;
      report(`  ✗ ${listing.title} — ${error instanceof AiError ? error.message : error}`);
      continue;
    }

    if (!extracted) {
      result.failed += 1;
      report(`  ✗ ${listing.title} — model returned nothing usable`);
      continue;
    }

    result.extracted += 1;

    // Step 4. A slug the model invented would render as a dead "take the quiz"
    // chip, so unknown slugs are dropped rather than trusted.
    const skills = cleanSkills(extracted.skills);
    const required = skills.filter((skill) => skill.required).map((skill) => skill.slug);
    const nice = skills.filter((skill) => !skill.required).map((skill) => skill.slug);

    if (required.length > MAX_REQUIRED_SKILLS) {
      // Treated as a failure, not stored: a listing tagged with half the
      // vocabulary is worse than no listing at all.
      result.failed += 1;
      report(
        `  ✗ ${listing.title} — ${required.length} required skills, over the ${MAX_REQUIRED_SKILLS} cap; the model dumped the vocabulary`,
      );
      continue;
    }

    if (skills.length === 0) {
      result.irrelevant += 1;
      report(`  – ${listing.title} — no skills in our vocabulary`);
      continue;
    }

    await upsertJob({
      id: listing.id,
      title: listing.title,
      company: listing.company,
      location: listing.location,
      remote: listing.remote,
      level: extracted.level,
      salaryRange: extracted.salaryRange,
      description: listing.description,
      url: listing.url,
      skills,
    });

    result.stored.push(listing.id);
    report(
      `  ✓ ${listing.title} [${extracted.level}] — ${required.join(', ') || '(none required)'}${nice.length ? ` · nice: ${nice.join(', ')}` : ''}`,
    );
  }

  return result;
}

/**
 * Keep real slugs only, once each, heaviest first.
 *
 * A slug listed twice keeps its stronger reading: required beats nice-to-have,
 * and the higher weight wins. Models do occasionally repeat themselves, and
 * the alternative is a unique-constraint violation on JobSkill.
 */
function cleanSkills(
  raw: { slug: string; weight: number; required: boolean }[],
): { slug: string; weight: number; required: boolean }[] {
  const bySlug = new Map<string, { slug: string; weight: number; required: boolean }>();

  for (const entry of raw) {
    const slug = entry.slug.trim().toLowerCase();
    if (!skillBySlug(slug)) continue;

    // Clamp rather than reject: a model that answers 7 still meant "very
    // important", and losing the skill over it would be worse.
    const weight = Math.min(5, Math.max(1, Math.round(entry.weight)));
    const existing = bySlug.get(slug);

    bySlug.set(slug, {
      slug,
      weight: Math.max(weight, existing?.weight ?? 0),
      required: entry.required || (existing?.required ?? false),
    });
  }

  return [...bySlug.values()].sort((a, b) => b.weight - a.weight);
}
