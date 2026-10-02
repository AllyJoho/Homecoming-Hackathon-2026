// @/types/career.ts
// The 26 career archetypes authored in data/careers.json and seeded into the
// Career / CareerSkill tables. Each one is a weighted bundle of canonical skill
// slugs, which makes it the bridge between a student's profile and the rest of
// the app:
//
//   - scoring a profile against all 26 ranks careers with no model call at all
//     (see @/lib/careers/match)
//   - `title` is a real occupation name ("Business Intelligence Analysts"), so
//     it doubles as the query string if live job listings get wired up — skill
//     slugs themselves make poor search terms
//
// Kept separate from the Prisma row types for the same reason @/types/profile
// is: the shapes the app reasons over shouldn't shift when a column is renamed.

/** One skill's importance to a career. */
export interface CareerSkillWeight {
  /** Canonical slug — must match @/lib/profile/skills. */
  slug: string;
  name: string;
  /** 1–5, as authored in data/careers.json. Higher is more central. */
  weight: number;
}

export interface Career {
  slug: string;
  /** Occupation title, e.g. "Information Security Analysts". */
  title: string;
  /** Grouping shown in the UI, e.g. "Cybersecurity". */
  field: string;
  description?: string;
  /** Weighted skills, heaviest first. */
  skills: CareerSkillWeight[];
}

/** One scored career, as returned by @/lib/careers/match. */
export interface CareerMatch {
  career: Career;
  /** 0–100: the share of this career's total skill weight the profile covers. */
  score: number;
  /** Slugs of this career's skills the student has proven by quiz. */
  provenSkills: string[];
  /**
   * Slugs they have but haven't proven by quiz — self-reported or read off a
   * resume. Counted at partial credit, and deliberately not in missingSkills.
   */
  claimedSkills: string[];
  /** Skills they have neither, heaviest first — the "learn this next" list. */
  missingSkills: CareerSkillWeight[];
}
