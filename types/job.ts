// @/types/job.ts
// Job listings come from real job boards, ingested by @/lib/jobs/ingest and
// stored in Postgres. `requiredSkills` / `niceToHaveSkills` hold canonical
// slugs, which no board publishes — the ingest's AI step is what produces
// them from a listing's prose. See @/lib/jobs/sources/types for the
// pre-extraction shape.

/** One skill a listing asks for, with how central it is to the role. */
export interface JobSkillWeight {
  /** Canonical slug — must match @/lib/profile/skills. */
  slug: string;
  name: string;
  /** 1-5, assigned by the ingest's extraction step. Same scale as careers. */
  weight: number;
  /** Required vs nice-to-have, as the listing framed it. */
  required: boolean;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  level: 'internship' | 'entry' | 'mid' | 'senior';
  salaryRange?: string;
  /**
   * Every extracted skill with its weight. This is what @/lib/jobs/match
   * scores against — the arrays below are convenience views over it.
   */
  skills: JobSkillWeight[];
  /** Slugs only, required ones. Derived from `skills`. */
  requiredSkills: string[];
  /** Slugs only, the rest. Derived from `skills`. */
  niceToHaveSkills: string[];
  description: string;
  url?: string;
}

/** One ranked match, as returned by the model. */
export interface JobMatch {
  jobId: string;
  /** 0–100 fit score. */
  score: number;
  /** Short, user-facing justifications. */
  reasons: string[];
  /** Required skills the user hasn't proven yet — drives "take this quiz next". */
  missingSkills: string[];
}

/** What the API hands the UI: the match joined back to its listing. */
export interface JobMatchWithJob extends JobMatch {
  job: Job;
}
