// @/lib/jobs/match.ts
// Ranks stored listings against a profile. No model call.
//
// This is the "pay once at ingest, then every search is a query" half. The
// judgment that used to need a model — which skills matter and how much — was
// already made during ingest and is sitting in JobSkill.weight. What's left is
// arithmetic, which means ranking is instant, free, identical on every run,
// and explainable from its own numbers rather than from prose a model wrote.
//
// Same shape as @/lib/careers/match, and now literally the same credit rules:
// both import creditFor from @/lib/profile/credit rather than each keeping a
// copy of the table. A student shouldn't see two different ideas of what their
// skills are worth depending on which page they're on, and a shared import is
// the only version of that promise a typecheck can keep.

import type { Job, JobMatch, JobMatchWithJob, JobSkillWeight } from '@/types/job';
import type { Profile, ProfileSkill } from '@/types/profile';
import { creditFor } from '@/lib/profile/credit';

/** Nice-to-haves count, but a must-have you lack should hurt more. */
const NICE_TO_HAVE_DISCOUNT = 0.4;

/**
 * The weighted demand a listing has to state before its score is taken at
 * face value. A thinner listing's score is scaled down — a confidence factor,
 * not a penalty: we know less about that job, so we claim less about the fit.
 *
 * Without it, a listing that asks for almost nothing scores perfectly. A real
 * example: a "Growth Marketing Intern" whose only extracted skill was SQL as a
 * nice-to-have came out at 100% and outranked every genuine match, because one
 * skill covered all of its tiny stated demand.
 *
 * The number is measured, not guessed. Across the stored listings the stake
 * distribution is min 5.6, p25 10.0, median 12.0, p75 15.2, max 24.2 — so 10
 * damps roughly the thinnest quarter. The first version of this was 9, which
 * only caught the bottom 17% and still let a 3-skill "Learning & Development
 * Intern" outrank a Stripe engineering internship that named five. Setting it
 * at the median instead would damp half the catalog, which makes most scores
 * artificially low rather than fixing the outliers.
 *
 * Re-measure if the catalog changes shape: p25 of the stake distribution is
 * the number to use.
 */
const CONFIDENCE_BASELINE = 10;

export interface JobMatchOptions {
  /** Drop matches below this score. 0 keeps everything. */
  minScore?: number;
  limit?: number;
}

/**
 * Rank listings for a profile, best fit first.
 *
 * Score is the share of a listing's *weighted* demand the student covers, so
 * missing one core skill costs more than missing two peripheral ones, and
 * scores stay comparable between a listing naming three skills and one naming
 * six.
 */
export function matchJobs(
  jobs: Job[],
  profile: Profile,
  { minScore = 1, limit }: JobMatchOptions = {},
): JobMatchWithJob[] {
  const evidenceBySlug = new Map(profile.skills.map((skill) => [skill.slug, skill]));

  const matches = jobs
    .map((job) => scoreJob(job, evidenceBySlug))
    .filter((match) => match.score >= minScore)
    .sort((a, b) => b.score - a.score);

  return limit === undefined ? matches : matches.slice(0, limit);
}

function scoreJob(
  job: Job,
  evidenceBySlug: Map<string, ProfileSkill>,
): JobMatchWithJob {
  let earned = 0;
  let total = 0;

  const proven: JobSkillWeight[] = [];
  const claimed: JobSkillWeight[] = [];
  const missing: JobSkillWeight[] = [];

  for (const skill of job.skills) {
    // A nice-to-have contributes less to both halves of the fraction, so
    // having one is a bonus and lacking one is a small penalty.
    const stake = skill.required ? skill.weight : skill.weight * NICE_TO_HAVE_DISCOUNT;
    total += stake;

    const evidence = evidenceBySlug.get(skill.slug);
    if (!evidence) {
      missing.push(skill);
      continue;
    }

    earned += stake * creditFor(evidence);
    (evidence.source === 'QUIZ' ? proven : claimed).push(skill);
  }

  // Coverage of what the listing asked for, damped by how much it asked.
  const coverage = total === 0 ? 0 : earned / total;
  const confidence = Math.min(1, total / CONFIDENCE_BASELINE);

  return {
    jobId: job.id,
    job,
    score: Math.round(coverage * confidence * 100),
    reasons: explain(job, proven, claimed, missing, confidence),
    // Required-only, heaviest first: the quiz that would move this match most.
    missingSkills: missing.filter((skill) => skill.required).map((skill) => skill.slug),
  };
}

/**
 * The reasons a card shows, written from the arithmetic.
 *
 * These used to come from a model, which is why they read like sentences. The
 * numbers say the same things — which core skills are covered, how much of the
 * gap is "unproven" versus "don't have it" — and they can't drift between runs
 * or inflate a score to be encouraging.
 */
function explain(
  job: Job,
  proven: JobSkillWeight[],
  claimed: JobSkillWeight[],
  missing: JobSkillWeight[],
  confidence: number,
): string[] {
  const reasons: string[] = [];
  const core = (list: JobSkillWeight[]) => list.filter((skill) => skill.weight >= 4);

  const provenCore = core(proven);
  if (provenCore.length > 0) {
    reasons.push(
      `Proven ${names(provenCore)} — ${provenCore.length === 1 ? 'a core requirement' : 'the core requirements'} here`,
    );
  } else if (proven.length > 0) {
    reasons.push(`Proven ${names(proven)}`);
  }

  if (claimed.length > 0) {
    reasons.push(
      `${names(claimed)} ${claimed.length === 1 ? 'matches' : 'match'}, but not proven by a quiz yet`,
    );
  }

  const missingCore = core(missing.filter((skill) => skill.required));
  if (missingCore.length > 0) {
    reasons.push(`Missing ${names(missingCore)}, which this role is built on`);
  }

  if (reasons.length === 0) {
    reasons.push(`Nothing here overlaps your skills yet — it wants ${names(job.skills.slice(0, 3))}`);
  }

  // Say so when the score is held back by a vague listing, rather than letting
  // a low number read as a bad fit.
  if (confidence < 0.7) {
    reasons.push("This listing names few concrete skills, so the score is cautious");
  }

  return reasons.slice(0, 3);
}

/** "SQL Fundamentals, Python for Data and 2 more" */
function names(skills: JobSkillWeight[]): string {
  const shown = skills.slice(0, 2).map((skill) => skill.name);
  const extra = skills.length - shown.length;

  const joined =
    shown.length === 2 ? `${shown[0]} and ${shown[1]}` : (shown[0] ?? '');
  return extra > 0 ? `${joined} and ${extra} more` : joined;
}

export type { JobMatch };
