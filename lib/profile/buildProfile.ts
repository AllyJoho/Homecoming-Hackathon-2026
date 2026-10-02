// @/lib/profile/buildProfile.ts
// Collapses a user's skills and certificates into the single `Profile` object
// the recommender reasons over.
//
// Why this exists as its own step rather than passing DB rows to the AI: the
// prompt should see a deduplicated, canonically-named, provenance-tagged skill
// list. Two skills that mean the same thing, or a skill name only a database
// would use, both make the model's ranking worse.

import type { Profile, ProfileSkill } from '@/types/profile';
import { getProfile } from '@/lib/db/queries';

export async function buildProfile(userId: string): Promise<Profile | null> {
  const profile = await getProfile(userId);
  if (!profile) return null;

  return { ...profile, skills: dedupeSkills(profile.skills) };
}

/**
 * One row per slug, preferring QUIZ provenance. A user who both self-reported
 * JavaScript and passed the JavaScript quiz should read as proven, not as two
 * separate claims.
 */
function dedupeSkills(skills: ProfileSkill[]): ProfileSkill[] {
  const bySlug = new Map<string, ProfileSkill>();

  for (const skill of skills) {
    const existing = bySlug.get(skill.slug);
    if (!existing || (existing.source === 'SELF_REPORTED' && skill.source === 'QUIZ')) {
      bySlug.set(skill.slug, skill);
    }
  }

  return [...bySlug.values()];
}

/** Proven skills only — handy for "you qualify" style filtering in the UI. */
export function provenSkills(profile: Profile): ProfileSkill[] {
  return profile.skills.filter((s) => s.source === 'QUIZ');
}

/** True when the profile has nothing to recommend from yet. */
export function isProfileEmpty(profile: Profile): boolean {
  return profile.skills.length === 0 && profile.certifications.length === 0;
}
