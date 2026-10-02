// @/prisma/queries.ts
// Every database read/write the app does, in one place. Route handlers and
// server components call these instead of touching `prisma` directly — so the
// award-a-certificate transaction can't be half-copied into two routes.

import type { AnswerSheet, Quiz, QuizResult } from '@/types/quiz';
import type { Certification, Profile, ProfileSkill } from '@/types/profile';
import { Prisma } from '@/lib/generated/prisma/client';
import { prisma } from '@/prisma/client';
import { normalizeSkill, skillBySlug } from '@/lib/profile/skills';

// Authored JSON quizzes aren't tiered the way the Question bank is, so every
// attempt from one is recorded at this single level. Replace this with a real
// tier once quizzes carry a BEGINNER/INTERMEDIATE/ADVANCED label.
const QUIZ_ATTEMPT_LEVEL = 'STANDARD';

// ── Users ────────────────────────────────────────────────────────────────────

export function getUserById(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

/**
 * Hackathon-grade "login": first sight of an email creates the account. Swap
 * this for a real identity provider before anyone outside the demo uses it.
 */
export function findOrCreateUserByEmail(email: string, name: string) {
  return prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {},
    create: { email: email.toLowerCase(), name },
  });
}

// ── Skills ───────────────────────────────────────────────────────────────────

/** A user's skills, flattened to the shape the UI and the recommender want. */
export async function listUserSkills(userId: string): Promise<ProfileSkill[]> {
  const rows = await prisma.userSkill.findMany({
    where: { userId },
    include: { skill: true },
    orderBy: { createdAt: 'asc' },
  });

  return rows.map((row) => ({
    slug: row.skill.slug,
    name: row.skill.name,
    category: row.skill.category ?? undefined,
    source: row.source,
  }));
}

/**
 * Add a self-reported skill. Returns null when the input isn't in the
 * canonical vocabulary, so the route can answer 400 with a useful message
 * rather than silently storing junk.
 */
export async function addUserSkill(userId: string, rawSkill: string): Promise<ProfileSkill | null> {
  const skill = normalizeSkill(rawSkill);
  if (!skill) return null;

  const skillRow = await ensureSkillRow(skill.slug);

  // The @@unique([userId, skillId]) pair makes re-adding a no-op rather than a
  // duplicate row.
  const row = await prisma.userSkill.upsert({
    where: { userId_skillId: { userId, skillId: skillRow.id } },
    update: {},
    create: { userId, skillId: skillRow.id, source: 'SELF_REPORTED' },
    include: { skill: true },
  });

  return {
    slug: row.skill.slug,
    name: row.skill.name,
    category: row.skill.category ?? undefined,
    source: row.source,
  };
}

export async function removeUserSkill(userId: string, slug: string): Promise<void> {
  await prisma.userSkill.deleteMany({ where: { userId, skill: { slug } } });
}

/**
 * Get (or lazily create) the canonical Skill row for a slug. The seed script
 * inserts all of CANONICAL_SKILLS, so this normally just reads — it exists so
 * a freshly reset database doesn't 500.
 */
async function ensureSkillRow(slug: string) {
  const known = skillBySlug(slug);
  return prisma.skill.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      name: known?.name ?? slug,
      category: known?.category,
    },
  });
}

// ── Attempts & certificates ──────────────────────────────────────────────────

/**
 * Store a graded attempt and, if it passed, mint the certificate and credit
 * the skill — all in one transaction, so a user can never end up with a
 * certificate whose attempt is missing (or vice versa).
 */
export async function recordAttempt(args: {
  userId: string;
  quiz: Quiz;
  result: QuizResult;
  answers: AnswerSheet;
}) {
  const { userId, quiz, result, answers } = args;

  return prisma.$transaction(async (tx) => {
    // Attempt is keyed to a Skill, so the skill row has to exist first.
    const known = skillBySlug(quiz.skillSlug);
    const skill = await tx.skill.upsert({
      where: { slug: quiz.skillSlug },
      update: {},
      create: {
        slug: quiz.skillSlug,
        name: known?.name ?? quiz.skillSlug,
        category: known?.category,
      },
    });

    const attempt = await tx.attempt.create({
      data: {
        userId,
        skillId: skill.id,
        quizId: quiz.id,
        level: QUIZ_ATTEMPT_LEVEL,
        score: result.score,
        passed: result.passed,
        answers: answers as unknown as Prisma.InputJsonValue,
      },
    });

    if (!result.passed) return { attempt, certification: null };

    // Passing upgrades the skill's provenance: a self-reported skill becomes
    // QUIZ-proven, which is what the recommender weights more heavily.
    await tx.userSkill.upsert({
      where: { userId_skillId: { userId, skillId: skill.id } },
      update: { source: 'QUIZ' },
      create: { userId, skillId: skill.id, source: 'QUIZ' },
    });

    // One certification per user per skill: re-passing upgrades the existing
    // row (new attempt, new score) instead of minting a duplicate credential.
    const certification = await tx.certification.upsert({
      where: { userId_skillId: { userId, skillId: skill.id } },
      update: {
        attemptId: attempt.id,
        quizId: quiz.id,
        title: quiz.title,
        level: QUIZ_ATTEMPT_LEVEL,
        score: result.score,
        earnedAt: new Date(),
      },
      create: {
        userId,
        skillId: skill.id,
        attemptId: attempt.id,
        quizId: quiz.id,
        title: quiz.title,
        level: QUIZ_ATTEMPT_LEVEL,
        score: result.score,
      },
    });

    return { attempt, certification };
  });
}

export function getAttempt(attemptId: string) {
  return prisma.attempt.findUnique({
    where: { id: attemptId },
    include: { certification: true },
  });
}

export async function listCertifications(userId: string): Promise<Certification[]> {
  const rows = await prisma.certification.findMany({
    where: { userId },
    orderBy: { earnedAt: 'desc' },
  });

  return rows.map(toCertification);
}

/** Public share page lookup — by slug, not by id, so ids stay unguessable. */
export async function getCertificationByShareSlug(shareSlug: string) {
  const row = await prisma.certification.findUnique({
    where: { shareSlug },
    include: { user: { select: { name: true } } },
  });
  if (!row) return null;

  // User.name is optional in the schema, but a public certificate always
  // renders a holder, so it falls back rather than showing "null".
  return { ...toCertification(row), holderName: row.user.name ?? 'Anonymous' };
}

// `quizId` is nullable in the schema (a certification can come from the
// Question bank rather than an authored quiz) but the API shape in
// @/types/profile promises a string, so it collapses to '' here.
function toCertification(row: {
  id: string;
  quizId: string | null;
  title: string;
  score: number;
  earnedAt: Date;
  shareSlug: string;
}): Certification {
  return {
    id: row.id,
    quizId: row.quizId ?? '',
    title: row.title,
    score: row.score,
    issuedAt: row.earnedAt.toISOString(),
    shareSlug: row.shareSlug,
  };
}

// ── Profile ──────────────────────────────────────────────────────────────────

/** Everything the recommender needs, in one round trip. */
export async function getProfile(userId: string): Promise<Profile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      skills: { include: { skill: true }, orderBy: { createdAt: 'asc' } },
      certifications: { orderBy: { earnedAt: 'desc' } },
    },
  });
  if (!user) return null;

  return {
    userId: user.id,
    name: user.name ?? '',
    skills: user.skills.map((row) => ({
      slug: row.skill.slug,
      name: row.skill.name,
      category: row.skill.category ?? undefined,
      source: row.source,
    })),
    certifications: user.certifications.map(toCertification),
  };
}
