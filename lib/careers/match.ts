// @/lib/careers/match.ts
// Scores a profile against the career archetypes. No model call: every career
// already carries authored 1–5 weights per skill, so "how close am I to this
// job family" is arithmetic, and spending tokens on it would be worse as well
// as slower — getting the same score twice in a row is a feature here.
//
// Pure, and it ranks rows it is handed, so the careers can come from the
// database (prisma/queries.ts `listCareers`) without this file knowing about
// it. Same shape as @/lib/jobs/shortlist for that reason.

import type { Career, CareerMatch, CareerSkillWeight } from '@/types/career';
import type { Profile } from '@/types/profile';

/**
 * What a self-reported skill is worth against a quiz-verified one.
 *
 * Half credit, matching how the rest of the app treats provenance: the
 * recommender's system prompt weights SELF_REPORTED below QUIZ, and
 * buildProfile's dedupe prefers QUIZ when a skill arrives both ways. A student
 * who merely claims every skill for a career should land mid-pack, not at
 * 100% — that gap is what makes "take this quiz next" worth acting on.
 */
const SELF_REPORTED_CREDIT = 0.5;

/**
 * Rank careers for a profile, best fit first.
 *
 * The score is the fraction of a career's *weighted* skills the student
 * covers, not a raw count: missing one 5-weight core skill should cost more
 * than missing two 2-weight peripheral ones. It also keeps scores comparable
 * across careers that list different numbers of skills.
 */
export function matchCareers(careers: Career[], profile: Profile, limit = 5): CareerMatch[] {
  const sourceBySlug = new Map(profile.skills.map((skill) => [skill.slug, skill.source]));

  return careers
    .map((career) => {
      const provenSkills: string[] = [];
      const claimedSkills: string[] = [];
      const missingSkills: CareerSkillWeight[] = [];
      let earned = 0;
      let total = 0;

      for (const skill of career.skills) {
        total += skill.weight;

        switch (sourceBySlug.get(skill.slug)) {
          case 'QUIZ':
            earned += skill.weight;
            provenSkills.push(skill.slug);
            break;
          case 'SELF_REPORTED':
            earned += skill.weight * SELF_REPORTED_CREDIT;
            claimedSkills.push(skill.slug);
            break;
          default:
            missingSkills.push(skill);
        }
      }

      return {
        career,
        // A career authored with no skills would divide by zero. Shouldn't
        // happen, but a seed typo shouldn't render NaN% to a student.
        score: total === 0 ? 0 : Math.round((earned / total) * 100),
        provenSkills,
        claimedSkills,
        // career.skills arrives heaviest-first from listCareers, so this
        // inherits that order — the first entry is the best next quiz to take.
        missingSkills,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * The one career to lead with, or null when nothing matches yet.
 *
 * Separate from `matchCareers` because the headline ("you look like a Business
 * Intelligence Analyst") and the list ("here are five directions") are
 * different questions, and a 0% top match should answer the first with
 * nothing rather than with a career the student has no claim on.
 */
export function topCareer(careers: Career[], profile: Profile): CareerMatch | null {
  const [best] = matchCareers(careers, profile, 1);
  return best && best.score > 0 ? best : null;
}
