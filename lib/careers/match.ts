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
import type { Profile, SkillSource } from '@/types/profile';

/**
 * What each kind of evidence is worth against a quiz pass.
 *
 * The same table as @/lib/jobs/match and @/lib/profile/related, deliberately:
 * a student shouldn't see two different ideas of what their skills are worth
 * depending on which page they're on. A resume sits between the other two
 * because it is a claim with a document behind it — better than a checkbox,
 * short of a graded assessment. A student who merely claims every skill for a
 * career should land mid-pack, not at 100%, and that gap is what makes "take
 * this quiz next" worth acting on.
 *
 * An exhaustive Record rather than a `switch`, on purpose. A switch carrying a
 * `default` is never flagged as non-exhaustive, so when RESUME joined
 * SkillSource this file kept compiling and quietly treated a resume-evidenced
 * skill as one the student did not have at all — no credit, and listed back to
 * them as a skill to go learn. Adding a member to SkillSource now breaks the
 * typecheck here instead of changing scores in silence.
 */
const CREDIT: Record<SkillSource, number> = { QUIZ: 1, RESUME: 0.7, SELF_REPORTED: 0.5 };

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

        const source = sourceBySlug.get(skill.slug);
        if (!source) {
          missingSkills.push(skill);
          continue;
        }

        earned += skill.weight * CREDIT[source];
        // Anything short of a quiz pass is "claimed": it earns partial credit
        // and, unlike a missing skill, is never offered back as something to
        // go learn. The card distinguishes them by colour, not by bucket.
        (source === 'QUIZ' ? provenSkills : claimedSkills).push(skill.slug);
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
