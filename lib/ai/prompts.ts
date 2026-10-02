// @/lib/ai/prompts.ts
// Prompt text lives here, away from the request code, so it can be edited and
// diffed on its own — prompts are the part of an AI feature that gets tuned
// most often during a hackathon.
//
// Caching note: the system prompt is a constant and is sent first, so it's the
// stable prefix. Keep per-user content (the profile, the listings) in the user
// message and this stays cacheable as the app grows.

import type { Job } from '@/types/job';
import type { Profile } from '@/types/profile';

export const RECOMMEND_SYSTEM_PROMPT = `You are a career advisor for university students at a hackathon demo.

You rank job listings against a student's skill profile. The profile distinguishes two kinds of skill:
- QUIZ: the student passed a graded assessment. Treat this as verified.
- SELF_REPORTED: the student typed it in. Treat this as a claim, and weight it lower than a verified skill.

Scoring guidance:
- 80-100: has most required skills, several of them verified.
- 50-79: partial overlap, or strong overlap but mostly self-reported.
- 1-49: adjacent at best.
Score on evidence, not enthusiasm. Do not inflate scores to be encouraging.

For each listing you return:
- "reasons": 1-3 short phrases addressed to the student ("Verified SQL covers the main requirement"). No preamble, no restating the job title.
- "missingSkills": required skills the student has not demonstrated, as the listing's own skill slugs. Empty array if none.

Rank by fit. Omit listings that are a genuinely poor match rather than padding the list.`;

/**
 * The per-request half: the student's profile and the candidate listings.
 * Listings are passed as compact JSON — field names are self-describing, so
 * prose framing would only add tokens.
 */
export function buildRecommendUserMessage(profile: Profile, jobs: Job[]): string {
  const skills = profile.skills.length
    ? profile.skills.map((s) => `- ${s.name} (${s.slug}) — ${s.source}`).join('\n')
    : '- (none yet)';

  const certs = profile.certifications.length
    ? profile.certifications.map((c) => `- ${c.title} — scored ${c.score}%`).join('\n')
    : '- (none yet)';

  const listings = jobs.map((job) => ({
    id: job.id,
    title: job.title,
    company: job.company,
    level: job.level,
    location: job.remote ? `${job.location} (remote)` : job.location,
    requiredSkills: job.requiredSkills,
    niceToHaveSkills: job.niceToHaveSkills,
    description: job.description,
  }));

  return `Student: ${profile.name}

Skills:
${skills}

Certificates earned:
${certs}

Listings to rank:
${JSON.stringify(listings, null, 2)}`;
}

/**
 * [stretch] Per-question coaching on a finished attempt, used by
 * /api/results/[resultId]/feedback.
 */
export const FEEDBACK_SYSTEM_PROMPT = `You are a patient tutor reviewing a student's completed quiz.

For each question the student got wrong, write 2-3 sentences: what the right answer is, and the specific misunderstanding the wrong answer suggests. Address the student directly. Skip questions they answered correctly. No overall score summary — they can already see their score.`;
