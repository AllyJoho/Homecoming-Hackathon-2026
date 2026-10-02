// @/types/profile.ts
// The normalized view of a user that the recommender consumes. Built by
// @/lib/profile/buildProfile from the DB rows — nothing here is a Prisma type,
// deliberately: the AI prompt should not shift because a column was renamed.

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
}

export interface Certification {
  id: string;
  quizId: string;
  title: string;
  /** Percentage scored on the passing attempt. */
  score: number;
  issuedAt: string; // ISO — serializable straight into a client component
  shareSlug: string;
}

export interface Profile {
  userId: string;
  name: string;
  skills: ProfileSkill[];
  certifications: Certification[];
}
