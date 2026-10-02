// @/lib/jobs/recommend.ts
// The AI half of the recommendations feature: hand the model the profile and a
// shortlist, get back a ranked set of matches with reasons.
//
// The response shape is enforced by the zod schema below, and both backends
// constrain generation to it rather than letting us hand-parse prose —
// Anthropic via structured outputs, Ollama via JSON-Schema-constrained
// decoding. A null back from generateObject means the model genuinely couldn't
// produce a ranking, and we fail loudly rather than rendering half a list.
//
// Which backend runs is @/lib/ai/provider's business, not this file's: the
// task id 'job-ranking' is the only model-related thing named here.

import { z } from 'zod';

import type { JobMatchWithJob } from '@/types/job';
import type { Profile } from '@/types/profile';
import { AiError, generateObject } from '@/lib/ai/provider';
import { RECOMMEND_SYSTEM_PROMPT, buildRecommendUserMessage } from '@/lib/ai/prompts';
import { shortlistJobs } from '@/lib/jobs/shortlist';
import { jobsById, listJobs } from '@/prisma/queries';

const JobMatchSchema = z.object({
  jobId: z.string().describe('The id of the listing, copied exactly'),
  score: z.number().min(0).max(100).describe('Fit score, 0-100'),
  reasons: z.array(z.string()).min(1).max(3),
  missingSkills: z.array(z.string()),
});

const RecommendationsSchema = z.object({
  matches: z.array(JobMatchSchema).describe('Best fit first'),
});

export class RecommendationError extends Error {}

/**
 * Rank listings for a profile. Returns matches joined back to their listings,
 * best first.
 *
 * Not streamed: the output is a short ranked list and the page needs it whole
 * before it can render. Streaming would also have to be implemented twice,
 * once per backend, for a list that renders in one paint.
 */
export async function recommendJobs(profile: Profile): Promise<JobMatchWithJob[]> {
  const candidates = shortlistJobs(await listJobs(), profile);
  if (candidates.length === 0) return [];

  let parsed;
  try {
    parsed = await generateObject({
      task: 'job-ranking',
      system: RECOMMEND_SYSTEM_PROMPT,
      prompt: buildRecommendUserMessage(profile, candidates),
      schema: RecommendationsSchema,
    });
  } catch (error) {
    // AiError already carries a message fit to show the student — a missing
    // key, a rate limit, an unreachable local daemon.
    if (error instanceof AiError) throw new RecommendationError(error.message);
    throw error;
  }

  if (!parsed) {
    throw new RecommendationError('The model did not return a usable ranking. Try again.');
  }

  // The model echoes ids back; drop anything that isn't a real listing rather
  // than trusting it blindly. One query for the whole set.
  const byId = new Map(
    (await jobsById(parsed.matches.map((m) => m.jobId))).map((job) => [job.id, job]),
  );

  return parsed.matches
    .flatMap((match) => {
      const job = byId.get(match.jobId);
      return job ? [{ ...match, job }] : [];
    })
    .sort((a, b) => b.score - a.score);
}
