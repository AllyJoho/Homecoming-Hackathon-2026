// @/lib/jobs/shortlist.ts
// The cheap deterministic half of job matching: narrow the candidate set
// before spending tokens on the model. Pure — it ranks rows it is handed, so
// the listings can come from the database (prisma/queries.ts `listJobs`)
// without this file knowing about it.

import type { Job } from '@/types/job';
import type { Profile } from '@/types/profile';

/**
 * Narrow the candidate set before sending it to the model.
 *
 * Sending all listings every time costs tokens and buries the plausible
 * matches. This does the cheap deterministic part — overlap on skill slugs —
 * and leaves the judgment (how much a partial, self-reported overlap is worth)
 * to the model. Listings with zero overlap are kept only to backfill up to
 * `limit`, so a brand-new profile still sees something.
 */
export function shortlistJobs(jobs: Job[], profile: Profile, limit = 20): Job[] {
  const userSlugs = new Set(profile.skills.map((s) => s.slug));

  const scored = jobs.map((job) => {
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
