// @/types/profile.ts
// The normalized view of a user that the recommender consumes. Built by
// @/lib/profile/buildProfile from the DB rows — nothing here is a Prisma type,
// deliberately: the AI prompt should not shift because a column was renamed.

import type { ProficiencyLevel } from '@/lib/quiz/levels';

export interface Skill {
  /** Canonical slug, e.g. "javascript". */
  slug: string;
  /** Display form, e.g. "JavaScript Fundamentals". */
  name: string;
  category?: string;
  /** One-line explanation, shown in the UI and given to the recommender. */
  description?: string;
}

/** Where a skill on a profile came from. Mirrors the Prisma `SkillSource` enum. */
export type SkillSource = 'SELF_REPORTED' | 'QUIZ';

export interface ProfileSkill extends Skill {
  source: SkillSource;
  /** Set when the skill was earned by quiz — the level reached on it. */
  level?: ProficiencyLevel;
}

export interface Certification {
  id: string;
  quizId: string;
  title: string;
  /** Percentage scored on the attempt this certificate came from. */
  score: number;
  /** The proficiency level printed on the certificate. */
  level: ProficiencyLevel;
  issuedAt: string; // ISO — serializable straight into a client component
  shareSlug: string;
}

export interface Profile {
  userId: string;
  name: string;
  skills: ProfileSkill[];
  certifications: Certification[];
}
