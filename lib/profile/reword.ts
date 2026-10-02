// @/lib/profile/reword.ts
// Rewords one experience entry's bullets, then checks the result against what
// the student actually wrote.
//
// The model call is the easy half. The half that makes this safe to put in
// front of a student is @/lib/profile/rewordGuard, which runs on every rewrite
// before it is offered: a rewrite that invented a figure is dropped and the
// original kept, with a note saying what happened.
//
// Nothing here writes to the database. A reword is a suggestion — the student
// accepts the ones they want in the form and saves as usual, so a bad
// suggestion costs a glance rather than a corrupted resume.

import { z } from 'zod';

import type { ExperienceKind } from '@/types/experience';
import { EXPERIENCE_KIND_LABEL } from '@/types/experience';
import { generateObject } from '@/lib/ai/provider';
import { REWORD_SYSTEM_PROMPT, buildRewordUserMessage } from '@/lib/ai/prompts';
import { checkReword, type RewordContext } from '@/lib/profile/rewordGuard';

/** Matches the form's own cap, so the two can't disagree about a valid entry. */
export const MAX_REWORD_BULLETS = 12;

const RewordSchema = z.object({
  bullets: z.array(
    z.object({
      index: z.number().int().describe('The index the bullet was labelled with'),
      reworded: z.string().describe('The rewritten bullet, or the original unchanged'),
      changed: z.boolean().describe('False when the bullet was already well written'),
    }),
  ),
});

export interface RewordedBullet {
  /** Position in the entry's bullet list. */
  index: number;
  original: string;
  /** What to offer. Equals `original` when there's nothing worth changing. */
  suggestion: string;
  /** False when the model left it alone, or the guard refused the rewrite. */
  changed: boolean;
  /**
   * Why this one is unchanged, or what to know about an accepted rewrite.
   * Written for the student to read.
   */
  note?: string;
}

export class RewordError extends Error {}

export interface RewordEntry {
  kind: ExperienceKind;
  title: string;
  organization: string;
  bullets: string[];
}

/**
 * Reword an entry's bullets. Returns one result per input bullet, in order.
 *
 * Throws only when the whole call is unusable. A single bullet the model
 * mishandled comes back as `changed: false` with a note, because the other
 * four are still worth showing.
 */
export async function rewordBullets(entry: RewordEntry): Promise<RewordedBullet[]> {
  const bullets = entry.bullets.map((bullet) => bullet.trim()).filter(Boolean);

  if (bullets.length === 0) {
    throw new RewordError('Write a bullet point or two first, then I can reword them.');
  }
  if (bullets.length > MAX_REWORD_BULLETS) {
    throw new RewordError(`That's ${bullets.length} bullets — ${MAX_REWORD_BULLETS} at a time.`);
  }

  const result = await generateObject({
    task: 'experience-reword',
    system: REWORD_SYSTEM_PROMPT,
    prompt: buildRewordUserMessage({
      // The label, not the enum name: "Leadership & Activities" tells the model
      // what kind of writing is wanted; "LEADERSHIP" is a database value.
      kind: EXPERIENCE_KIND_LABEL[entry.kind],
      title: entry.title,
      organization: entry.organization,
      bullets,
    }),
    schema: RewordSchema,
  });

  if (!result) {
    throw new RewordError('The model did not return usable rewrites. Try again.');
  }

  return applyGuard(bullets, result.bullets, {
    title: entry.title,
    organization: entry.organization,
  });
}

/**
 * Pair each original bullet with what the model offered for it, and run the
 * guard over every rewrite.
 *
 * Separated from the call above so it can be tested without a model. It is the
 * subtlest code in this feature: a mismatch here would pair bullet 3's rewrite
 * with bullet 2 and show the student a confident diff of the wrong line, which
 * is worse than any rewrite the guard rejects.
 */
export function applyGuard(
  bullets: string[],
  offered: { index: number; reworded: string; changed: boolean }[],
  context: RewordContext,
): RewordedBullet[] {
  // Keyed by index rather than zipped by position: the schema can't stop a
  // model from returning four entries for five bullets, or returning them out
  // of order. First writer wins, so a duplicated index can't overwrite a
  // bullet that was already matched.
  const byIndex = new Map<number, { reworded: string; changed: boolean }>();
  for (const item of offered) {
    if (Number.isInteger(item.index) && !byIndex.has(item.index)) {
      byIndex.set(item.index, { reworded: item.reworded, changed: item.changed });
    }
  }

  return bullets.map((original, index) => {
    const suggestion = byIndex.get(index);

    if (!suggestion) {
      return {
        index,
        original,
        suggestion: original,
        changed: false,
        note: 'Kept as yours — the model skipped this one.',
      };
    }

    const rewrite = suggestion.reworded.trim();

    // Took the instruction to leave a good bullet alone. Not a failure.
    if (!suggestion.changed || rewrite === original) {
      return { index, original, suggestion: original, changed: false };
    }

    const check = checkReword(original, rewrite, context);

    if (!check.ok) {
      return {
        index,
        original,
        suggestion: original,
        changed: false,
        note: `Kept as you wrote it — the rewrite ${check.reason}.`,
      };
    }

    return { index, original, suggestion: rewrite, changed: true, note: check.warning };
  });
}
