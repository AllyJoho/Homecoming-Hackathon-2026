// @/lib/quiz/levels.ts
// The certificate levels a score can earn. Below the lowest cutoff there is no
// certificate at all — the quiz is a credential, so it has to mean something.
//
// The cutoffs are authored as "N of 15 correct" because 15 is the standard
// quiz length, and applied as the same FRACTION of whatever a quiz is worth.
// A 20-question or weighted quiz is held to the same standard, and the
// comparison is exact integer math, so 8/15 never loses to rounding.
//
// Change the levels here and nowhere else: everything else reads this table.

export const PROFICIENCY_LEVELS = ['Foundational', 'Proficient', 'Expert'] as const;

export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number];

/** The quiz length the cutoffs are written against. */
const STANDARD_QUESTIONS = 15;

/** Highest first, so a score takes the first band it reaches. */
const LEVEL_CUTOFFS: ReadonlyArray<{ level: ProficiencyLevel; correct: number }> = [
  { level: 'Expert', correct: 14 }, // 93.3%
  { level: 'Proficient', correct: 12 }, // 80%
  { level: 'Foundational', correct: 8 }, // 53.3% — the certificate threshold
];

/** Whether `earned` out of `possible` reaches a band. Integer math, no rounding. */
function reaches(earned: number, possible: number, correct: number): boolean {
  return possible > 0 && earned * STANDARD_QUESTIONS >= correct * possible;
}

/**
 * The level a result earns, or null when it falls short of a certificate.
 * Takes points rather than the rounded percentage so the cutoffs are exact.
 */
export function levelFor(earned: number, possible: number): ProficiencyLevel | null {
  return LEVEL_CUTOFFS.find((band) => reaches(earned, possible, band.correct))?.level ?? null;
}

/** A level's cutoff as a percentage, for display ("80%"). One decimal at most. */
export function levelMinPercent(level: ProficiencyLevel): number {
  const band = LEVEL_CUTOFFS.find((b) => b.level === level)!;
  return Math.round((band.correct / STANDARD_QUESTIONS) * 1000) / 10;
}

/**
 * The next level up and how many more points it needed, or null at the top.
 * "Points" are questions on an unweighted quiz.
 */
export function nextLevel(
  earned: number,
  possible: number,
): { level: ProficiencyLevel; pointsNeeded: number } | null {
  const higher = [...LEVEL_CUTOFFS].reverse().find((band) => !reaches(earned, possible, band.correct));
  if (!higher) return null;
  const pointsRequired = Math.ceil((higher.correct * possible) / STANDARD_QUESTIONS);
  return { level: higher.level, pointsNeeded: pointsRequired - earned };
}

/**
 * The shared colour vocabulary for a level. Used by the certificate, the
 * skill tags, and the colour-coded quiz links on the job search page — one
 * mapping so a level looks the same everywhere.
 */
export const LEVEL_TONE: Record<ProficiencyLevel, 'neutral' | 'info' | 'success' | 'warning'> = {
  Foundational: 'neutral',
  Proficient: 'info',
  Expert: 'success',
};
