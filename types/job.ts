// @/types/job.ts
// Job listings are authored in data/jobs/listings.json and seeded into
// Postgres. The shape is kept close to what a real job board API returns, so
// swapping the loaders in @/prisma/queries for a live fetch stays local.

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  level: 'internship' | 'entry' | 'mid' | 'senior';
  salaryRange?: string;
  /** Canonical skill slugs — must match @/lib/profile/skills. */
  requiredSkills: string[];
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
