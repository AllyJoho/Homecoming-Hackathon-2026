// @/lib/jobs/listings.ts
// Job listings, loaded from the seeded JSON. Everything downstream goes
// through these functions, so replacing the file with a live job-board fetch
// (Adzuna, USAJobs, Handshake…) means rewriting only this module — make them
// async-returning then and callers won't notice.

import type { Job } from '@/types/job';
import type { Profile } from '@/types/profile';
import listingsJson from '@/data/jobs/listings.json';

const JOBS = listingsJson as Job[];

export function listJobs(): Job[] {
  return JOBS;
}

export function getJob(id: string): Job | null {
  return JOBS.find((job) => job.id === id) ?? null;
}

/** Index for joining model output (which returns ids) back to full listings. */
const BY_ID = new Map(JOBS.map((job) => [job.id, job]));

export function jobsById(ids: string[]): Job[] {
  return ids.map((id) => BY_ID.get(id)).filter((job): job is Job => Boolean(job));
}

/**
 * Narrow the candidate set before sending it to the model.
 *
 * Sending all listings every time costs tokens and buries the plausible
 * matches. This does the cheap deterministic part — overlap on skill slugs —
 * and leaves the judgment (how much a partial, self-reported overlap is worth)
 * to the model. Listings with zero overlap are kept only to backfill up to
 * `limit`, so a brand-new profile still sees something.
 */
export function shortlistJobs(profile: Profile, limit = 20): Job[] {
  const userSlugs = new Set(profile.skills.map((s) => s.slug));

  const scored = JOBS.map((job) => {
    const required = job.requiredSkills.filter((slug) => userSlugs.has(slug)).length;
    const nice = job.niceToHaveSkills.filter((slug) => userSlugs.has(slug)).length;
    // Required overlap counts double — matching a must-have is stronger
    // evidence than matching a bonus.
    return { job, overlap: required * 2 + nice };
  });

  const overlapping = scored.filter((s) => s.overlap > 0).sort((a, b) => b.overlap - a.overlap);
  const rest = scored.filter((s) => s.overlap === 0);

  return [...overlapping, ...rest].slice(0, limit).map((s) => s.job);
}
