// @/lib/jobs/recommend.ts
// The AI half of the recommendations feature: hand Claude the profile and a
// shortlist, get back a ranked set of matches with reasons.
//
// The response shape is enforced by a zod schema via structured outputs, so
// this never hand-parses model prose. If the model can't fill the schema, the
// SDK gives us `parsed_output: null` and we fail loudly rather than rendering
// half a list.

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

import type { JobMatchWithJob } from '@/types/job';
import type { Profile } from '@/types/profile';
import { MODEL, aiEnabled, anthropic } from '@/lib/ai/client';
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
 * before it can render. If this grows into "explain every listing in detail",
 * switch to `anthropic.messages.stream()` and `.finalMessage()`.
 */
export async function recommendJobs(profile: Profile): Promise<JobMatchWithJob[]> {
  if (!aiEnabled) {
    throw new RecommendationError('ANTHROPIC_API_KEY is not set — add it to .env');
  }

  const candidates = shortlistJobs(await listJobs(), profile);
  if (candidates.length === 0) return [];

  try {
    const response = await anthropic.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // Opus 5 thinks adaptively by default, which is what we want here —
      // ranking is a judgment call, not an extraction.
      system: RECOMMEND_SYSTEM_PROMPT,
      output_config: { format: zodOutputFormat(RecommendationsSchema) },
      messages: [{ role: 'user', content: buildRecommendUserMessage(profile, candidates) }],
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      throw new RecommendationError('The model did not return a usable ranking. Try again.');
    }

    // The model echoes ids back; drop anything that isn't a real listing
    // rather than trusting it blindly. One query for the whole set.
    const byId = new Map(
      (await jobsById(parsed.matches.map((m) => m.jobId))).map((job) => [job.id, job]),
    );

    return parsed.matches
      .flatMap((match) => {
        const job = byId.get(match.jobId);
        return job ? [{ ...match, job }] : [];
      })
      .sort((a, b) => b.score - a.score);
  } catch (error) {
    if (error instanceof RecommendationError) throw error;

    // Typed SDK errors, most specific first — a rate limit is retryable and a
    // bad key is not, and the UI should be able to say which.
    if (error instanceof Anthropic.AuthenticationError) {
      throw new RecommendationError('ANTHROPIC_API_KEY was rejected.');
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new RecommendationError('Rate limited by the API — wait a moment and retry.');
    }
    if (error instanceof Anthropic.APIError) {
      throw new RecommendationError(`Claude API error ${error.status}: ${error.message}`);
    }
    throw error;
  }
}
