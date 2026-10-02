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

// ── Skill catalog ────────────────────────────────────────────────────────────
// The home screen groups every skill in the vocabulary into one of three
// buckets. The bucket is derived, not stored: it falls out of whether the user
// has a UserSkill row for the skill and what that row's `source` is.

export type SkillStatus =
  | 'CERTIFIED' // UserSkill.source === 'QUIZ' — passed the quiz
  | 'MINE' // UserSkill.source === 'SELF_REPORTED' — claimed, not yet proven
  | 'AVAILABLE'; // no UserSkill row — the rest of the vocabulary

/** One card in the skills grid. */
export interface CatalogSkill extends Skill {
  status: SkillStatus;
  /**
   * The quiz that certifies this skill, when one has been authored. Skills
   * without one can't be moved to CERTIFIED yet, and the card says so rather
   * than linking nowhere.
   */
  quizId?: string;
  /** Percentage on the passing attempt. CERTIFIED only. */
  score?: number;
  /** Share slug for /certificates/[certId]. CERTIFIED only. */
  shareSlug?: string;
  /** ISO timestamp the certificate was earned. CERTIFIED only. */
  certifiedAt?: string;
}

/** The catalog split into the three sections the grid renders. */
export interface SkillCatalog {
  certified: CatalogSkill[];
  mine: CatalogSkill[];
  available: CatalogSkill[];
}
