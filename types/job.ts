// @/types/job.ts
// Job listings are seeded from data/jobs/listings.json. The shape is kept
// close to what a real job board API returns, so swapping the loader in
// @/lib/jobs/listings for a live fetch doesn't ripple outward.

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
