// @/lib/profile/credit.ts
// What one piece of evidence about a skill is worth, as a fraction of a
// flawless pass. Every consumer reads this table and nothing else defines it.
//
// It lives in its own module because it used to live in three: @/lib/jobs/match,
// @/lib/careers/match and @/lib/profile/related each kept a copy, and when
// RESUME was added to SkillSource only two of them were updated — the careers
// matcher went on scoring a resume-evidenced skill as one the student did not
// have, for weeks. One table, imported three times, cannot drift like that.
//
// Both maps are exhaustive Records rather than switches: adding a level or a
// source now fails the typecheck here instead of silently falling through to
// some default. That is the specific mistake this file exists to prevent.

import type { ProficiencyLevel } from '@/lib/quiz/levels';
import type { SkillSource } from '@/types/profile';

/**
 * A skill together with how well it is evidenced.
 *
 * `level` is meaningful only for QUIZ: it's the band the passing attempt
 * reached, read off the student's Certification for that skill.
 */
export interface SkillEvidence {
  source: SkillSource;
  level?: ProficiencyLevel;
}

/**
 * A pass is graded, not binary.
 *
 * The certificate thresholds (@/lib/quiz/levels) are 53.3% / 80% / 93.3%, so
 * treating every pass as full credit meant scraping a Foundational counted
 * exactly as much as a perfect Expert run. These three bands keep a pass worth
 * clearly more than any unproven claim while still leaving something to earn
 * by retaking — which is the point, since a retake that scores higher upgrades
 * the certificate in place.
 */
const QUIZ_CREDIT: Record<ProficiencyLevel, number> = {
  Expert: 1,
  Proficient: 0.9,
  Foundational: 0.8,
};

/**
 * Unproven evidence, below every quiz band. A resume is a claim with a
 * document behind it — better than a checkbox, short of a graded assessment.
 */
const UNPROVEN_CREDIT: Record<Exclude<SkillSource, 'QUIZ'>, number> = {
  RESUME: 0.7,
  SELF_REPORTED: 0.5,
};

/**
 * A QUIZ row whose Certification is missing — the certificate can outlive a
 * pruned attempt, and the UserSkill upgrade and the Certification are written
 * in one transaction but read separately. Credit it as the lowest band rather
 * than as unproven: they did pass.
 */
const QUIZ_WITHOUT_LEVEL = QUIZ_CREDIT.Foundational;

/** What this evidence is worth, 0–1. Multiply an authored skill weight by it. */
export function creditFor({ source, level }: SkillEvidence): number {
  if (source === 'QUIZ') return level ? QUIZ_CREDIT[level] : QUIZ_WITHOUT_LEVEL;
  return UNPROVEN_CREDIT[source];
}

/** The ladder, weakest first — for UI that explains the weighting. */
export const CREDIT_LADDER: ReadonlyArray<{ label: string; credit: number }> = [
  { label: 'Self-reported', credit: UNPROVEN_CREDIT.SELF_REPORTED },
  { label: 'From your resume', credit: UNPROVEN_CREDIT.RESUME },
  { label: 'Foundational', credit: QUIZ_CREDIT.Foundational },
  { label: 'Proficient', credit: QUIZ_CREDIT.Proficient },
  { label: 'Expert', credit: QUIZ_CREDIT.Expert },
];
