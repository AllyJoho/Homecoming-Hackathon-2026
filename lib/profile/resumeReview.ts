// @/lib/profile/resumeReview.ts
// Reviews a student's experience entries: what story they tell, what's working,
// and which specific lines to fix tonight.
//
// Split in two on purpose. The countable weaknesses — bullets with no figure,
// bullets that open by describing a duty instead of something done — are
// counted here in code and handed to the model as established fact. Only the
// judgment is a model call.
//
// That split is not just thrift. A model asked "how many of these bullets have
// numbers" will answer confidently and be off by one, and a review whose
// arithmetic a student can check and find wrong is a review they stop
// believing. Counting is not a judgment call, so it isn't sent to a model.
//
// What this deliberately does NOT assess is how employable or risky the
// student seems. @/lib/ai/prompts (RESUME_REVIEW_SYSTEM_PROMPT) has the
// reasoning; the short version is that a resume holds no ground truth for it,
// and the features a model would reach for are ones a student cannot change.

import { z } from 'zod';

import type { Experience } from '@/types/experience';
import type { Career } from '@/types/career';
import type { Profile } from '@/types/profile';
import { generateObject } from '@/lib/ai/provider';
import {
  RESUME_REVIEW_SYSTEM_PROMPT,
  buildResumeReviewUserMessage,
} from '@/lib/ai/prompts';
import { extractFigures } from '@/lib/profile/rewordGuard';
import { topCareer } from '@/lib/careers/match';

/**
 * Openers that describe a standing responsibility rather than something the
 * student did.
 *
 * "Responsible for maintaining the database" and "Rebuilt the database's
 * indexing" can describe the same week of work, and the second one gets read.
 * This is the most common fixable weakness in a student resume and it's
 * detectable from the first few words, so it's counted rather than guessed at.
 *
 * Kept to openers — "helped" mid-sentence is usually fine, and flagging it
 * would turn a useful count into noise.
 */
const DUTY_OPENERS = [
  'responsible for',
  'duties included',
  'tasked with',
  'helped',
  'assisted',
  'worked on',
  'worked with',
  'participated in',
  'involved in',
  'in charge of',
];

/** Bullets longer than this read as a paragraph on a printed resume. */
const LONG_BULLET_CHARS = 240;

export interface ReviewCounts {
  entries: number;
  bullets: number;
  /** Bullets stating no figure at all — see extractFigures. */
  withoutFigures: number;
  dutyPhrased: number;
  /** Entries with no bullets, which print as a bare heading. */
  emptyEntries: number;
  overlongBullets: number;
}

/** A weakness located precisely enough for the student to go fix it. */
export interface CountedFinding {
  /** The entry's title, so the UI can point at a row. */
  where: string;
  bullet: string;
  reason: string;
}

export interface ResumeReview {
  counts: ReviewCounts;
  /** Measured, not generated. Shown even when the model call fails. */
  counted: CountedFinding[];
  target: { title: string; percent: number } | null;
  throughLine: string;
  focus: string;
  strengths: string[];
  fixes: { where: string; problem: string; suggestion: string }[];
}

const ReviewSchema = z.object({
  throughLine: z.string().describe('One sentence: the story a ten-second skim tells'),
  focus: z.string().describe('Two or three sentences on whether the entries point one direction'),
  strengths: z.array(z.string()).max(3),
  fixes: z
    .array(
      z.object({
        where: z.string().describe("The entry's title, copied as given"),
        problem: z.string(),
        suggestion: z.string(),
      }),
    )
    .max(5),
});

export class ResumeReviewError extends Error {}

/** Minimum worth spending a call on — below this the advice writes itself. */
const MIN_REVIEW_BULLETS = 3;

function opensWithDuty(bullet: string): boolean {
  const start = bullet.trim().toLowerCase();
  return DUTY_OPENERS.some((opener) => start.startsWith(opener));
}

/**
 * Count the weaknesses that are countable, and locate them.
 *
 * Exported so the route can show this half even when the model call fails:
 * "four of your nine bullets have no numbers in them, here they are" is
 * genuinely useful on its own and costs nothing.
 */
export function countWeaknesses(experiences: Experience[]): {
  counts: ReviewCounts;
  counted: CountedFinding[];
} {
  const counted: CountedFinding[] = [];
  let emptyEntries = 0;

  for (const entry of experiences) {
    const label = entry.title || entry.organization || 'Untitled entry';

    if (entry.bullets.length === 0) {
      emptyEntries += 1;
      // EDUCATION routinely has no bullets and reads fine that way, so it is
      // counted but not reported as something to fix.
      if (entry.kind !== 'EDUCATION') {
        counted.push({
          where: label,
          bullet: '',
          reason: 'has no bullet points, so it prints as a bare heading',
        });
      }
      continue;
    }

    for (const bullet of entry.bullets) {
      // One finding per bullet, worst first: a line that is both duty-phrased
      // and figureless is reported on the problem worth fixing first, so the
      // list stays as long as the number of weak lines rather than double
      // counting them.
      const reason = worstProblem(bullet);
      if (reason) counted.push({ where: label, bullet, reason });
    }
  }

  // Counted over every bullet independently of which finding won each one, so
  // the totals handed to the model are true counts rather than a side effect
  // of reporting priority.
  const bullets = experiences.flatMap((entry) => entry.bullets);

  return {
    counts: {
      entries: experiences.length,
      bullets: bullets.length,
      withoutFigures: bullets.filter((b) => extractFigures(b).size === 0).length,
      dutyPhrased: bullets.filter(opensWithDuty).length,
      emptyEntries,
      overlongBullets: bullets.filter((b) => b.length > LONG_BULLET_CHARS).length,
    },
    counted,
  };
}

/**
 * The one thing most worth saying about a bullet, or null if it's fine.
 *
 * Ordered by what a student should fix first: a duty-phrased opener is a
 * rewrite of the whole line, a missing figure is a fact to go look up, and
 * length is a trim. Returning only the first keeps the findings list
 * actionable instead of scolding one bullet three times.
 */
function worstProblem(bullet: string): string | null {
  if (opensWithDuty(bullet)) {
    return 'opens by naming a duty rather than something you did';
  }
  if (extractFigures(bullet).size === 0) {
    return 'states no number — no scale, duration, or result';
  }
  if (bullet.length > LONG_BULLET_CHARS) {
    return `is ${bullet.length} characters, which prints as a paragraph`;
  }
  return null;
}

/**
 * Review a student's entries. `careers` and `profile` are only used for the
 * free career match that grounds the focus question — a target read off stored
 * skill weights rather than one the model guessed at.
 */
export async function reviewResume(
  experiences: Experience[],
  careers: Career[],
  profile: Profile,
): Promise<ResumeReview> {
  const { counts, counted } = countWeaknesses(experiences);

  if (counts.bullets < MIN_REVIEW_BULLETS) {
    throw new ResumeReviewError(
      `There are ${counts.bullets} bullet point${counts.bullets === 1 ? '' : 's'} to review. Add a few more — or paste a resume above — and this gets useful.`,
    );
  }

  const best = topCareer(careers, profile);
  const target = best ? { title: best.career.title, percent: best.score } : null;

  const review = await generateObject({
    task: 'resume-review',
    system: RESUME_REVIEW_SYSTEM_PROMPT,
    prompt: buildResumeReviewUserMessage({
      entries: experiences.map((entry) => ({
        kind: entry.kind,
        title: entry.title,
        organization: entry.organization,
        bullets: entry.bullets,
      })),
      counts: {
        entries: counts.entries,
        bullets: counts.bullets,
        withoutFigures: counts.withoutFigures,
        dutyPhrased: counts.dutyPhrased,
      },
      weakLines: counted,
      target,
    }),
    schema: ReviewSchema,
  });

  if (!review) {
    throw new ResumeReviewError('The model did not return a usable review. Try again.');
  }

  // A "strength" that is just an entry's name carries no information — the
  // model does this when it runs out of things to praise. Dropping them is
  // better than rendering a heading with nothing under it.
  const labels = new Set(
    experiences.map((entry) => (entry.title || entry.organization || '').toLowerCase()),
  );

  return {
    counts,
    counted,
    target,
    throughLine: review.throughLine.trim(),
    focus: review.focus.trim(),
    strengths: review.strengths
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !labels.has(s.toLowerCase()) && s.split(/\s+/).length >= 5),
    fixes: review.fixes
      .map((fix) => ({
        where: fix.where.trim(),
        problem: fix.problem.trim(),
        suggestion: fix.suggestion.trim(),
      }))
      .filter((fix) => fix.problem && fix.suggestion),
  };
}
