// @/lib/quiz/levels.ts
// The four proficiency levels a score maps to. This replaces pass/fail
// entirely: every completed quiz earns a certificate, and the level is what's
// printed on it.
//
// ⚠️ THE CUTOFFS BELOW ARE A PLACEHOLDER. "Percentage cutoffs for each level"
// is still an open question in the README. They're isolated here as one array
// so settling it is a one-line change — don't scatter these numbers.

export const PROFICIENCY_LEVELS = [
  'Beginner',
  'Intermediate',
  'Proficient',
  'Advanced',
] as const;

export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number];

/**
 * Highest cutoff first. A score earns the first level whose `min` it reaches,
 * so the bands are read top-down and can't leave a gap.
 */
const LEVEL_CUTOFFS: ReadonlyArray<{ level: ProficiencyLevel; min: number }> = [
  { level: 'Advanced', min: 90 },
  { level: 'Proficient', min: 75 },
  { level: 'Intermediate', min: 60 },
  { level: 'Beginner', min: 0 },
];

/** Percentage (0–100) → level. Always returns a level; 0 is Beginner. */
export function levelFor(score: number): ProficiencyLevel {
  const match = LEVEL_CUTOFFS.find((band) => score >= band.min);
  // The last band is min: 0, so this is unreachable for a 0–100 input — the
  // fallback exists only to keep the return type honest.
  return match?.level ?? 'Beginner';
}

/** The score a student needs for the next level up, or null at Advanced. */
export function nextLevelThreshold(score: number): { level: ProficiencyLevel; min: number } | null {
  const higher = [...LEVEL_CUTOFFS].reverse().find((band) => band.min > score);
  return higher ?? null;
}

/**
 * The shared colour vocabulary for a level. Used by the certificate, the
 * skill tags, and the colour-coded quiz links on the job search page — one
 * mapping so a level looks the same everywhere.
 */
export const LEVEL_TONE: Record<ProficiencyLevel, 'neutral' | 'info' | 'success' | 'warning'> = {
  Beginner: 'neutral',
  Intermediate: 'warning',
  Proficient: 'info',
  Advanced: 'success',
};
