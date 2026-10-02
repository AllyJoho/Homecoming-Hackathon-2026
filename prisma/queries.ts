// @/prisma/queries.ts
// Every database read/write the app does, in one place. Route handlers and
// server components call these instead of touching `prisma` directly — so the
// award-a-certificate transaction can't be half-copied into two routes.

import type { AnswerSheet, Question, Quiz, QuizOption, QuizResult } from '@/types/quiz';
import type {
  Certification,
  Profile,
  ProfileSkill,
  SkillCatalog,
} from '@/types/profile';
import type { Job } from '@/types/job';
import type { Career } from '@/types/career';
import { Prisma } from '@/lib/generated/prisma/client';
import { prisma } from '@/prisma/client';
import { normalizeSkill, skillBySlug } from '@/lib/profile/skills';
import type { ProficiencyLevel as DbProficiencyLevel } from '@/lib/generated/prisma/enums';
import type { ProficiencyLevel } from '@/lib/quiz/levels';

// The Prisma `ProficiencyLevel` enum and the TS union in lib/quiz/levels.ts are
// two declarations of the same thing. These assignments fail to compile if
// either side gains, loses, or renames a level — cheaper than a runtime check.
type _LevelsMatchForward = ProficiencyLevel extends DbProficiencyLevel ? true : never;
type _LevelsMatchBackward = DbProficiencyLevel extends ProficiencyLevel ? true : never;
const _levelsAgree: [_LevelsMatchForward, _LevelsMatchBackward] = [true, true];
void _levelsAgree;

// ── Users ────────────────────────────────────────────────────────────────────

export function getUserById(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

// Account creation goes through Better Auth (lib/auth/server.ts), which hashes
// the password onto Account.password. There is deliberately no create-user
// helper here: one would make it possible to mint a credential-less account.

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

/**
 * Every skill in the vocabulary, bucketed for the three sections of the
 * skills grid: certified (quiz passed), mine (self-reported) and available
 * (everything else).
 *
 * One query per table rather than a per-skill subquery: it's ~46 skills, two
 * handfuls of user rows and a couple of quizzes, so three reads and a join in
 * memory beats anything cleverer. The bucket is derived here rather than
 * stored, so passing a quiz moves a card between sections with no extra write
 * beyond the `source` upgrade recordAttempt already does.
 */
export async function listSkillCatalog(userId: string): Promise<SkillCatalog> {
  const [skills, userSkills, certifications, quizzes] = await Promise.all([
    prisma.skill.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
    prisma.userSkill.findMany({ where: { userId } }),
    prisma.certification.findMany({ where: { userId } }),
    // A skill can in principle have several authored quizzes; the card links
    // to one, so the first by id wins and the rest are ignored.
    prisma.quiz.findMany({ select: { id: true, skillId: true }, orderBy: { id: 'asc' } }),
  ]);

  const sourceBySkillId = new Map(userSkills.map((row) => [row.skillId, row.source]));
  const certBySkillId = new Map(certifications.map((row) => [row.skillId, row]));
  const quizIdBySkillId = new Map<string, string>();
  for (const quiz of quizzes) {
    if (!quizIdBySkillId.has(quiz.skillId)) quizIdBySkillId.set(quiz.skillId, quiz.id);
  }

  const catalog: SkillCatalog = { certified: [], mine: [], available: [] };

  for (const skill of skills) {
    const base = {
      slug: skill.slug,
      name: skill.name,
      category: skill.category ?? undefined,
      description: skill.description ?? undefined,
      quizId: quizIdBySkillId.get(skill.id),
    };

    // A QUIZ-sourced row is the authority on "certified": recordAttempt writes
    // the UserSkill upgrade and the Certification in the same transaction, so
    // the certificate fields are read off the cert row when it's there and the
    // card still renders as certified if it somehow isn't.
    if (sourceBySkillId.get(skill.id) === 'QUIZ') {
      const cert = certBySkillId.get(skill.id);
      catalog.certified.push({
        ...base,
        status: 'CERTIFIED',
        score: cert?.score,
        shareSlug: cert?.shareSlug,
        certifiedAt: cert?.earnedAt.toISOString(),
      });
    } else if (sourceBySkillId.has(skill.id)) {
      catalog.mine.push({ ...base, status: 'MINE' });
    } else {
      catalog.available.push({ ...base, status: 'AVAILABLE' });
    }
  }

  // Newest certificate first; the other two keep the category/name ordering
  // the query already produced.
  catalog.certified.sort((a, b) => (b.certifiedAt ?? '').localeCompare(a.certifiedAt ?? ''));

  return catalog;
}

// ── Attempts & certificates ──────────────────────────────────────────────────

/**
 * Store a graded attempt, award its certificate, and credit the skill — all in
 * one transaction, so a user can never end up with a certificate whose attempt
 * is missing (or vice versa).
 *
 * There is no pass/fail: every completed attempt earns a certificate, and the
 * proficiency level derived from the score is what varies.
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
        level: result.level,
        score: result.score,
        answers: answers as unknown as Prisma.InputJsonValue,
      },
    });

    // Completing a quiz upgrades the skill's provenance: a self-reported skill
    // becomes QUIZ-backed. The level, not the source, is the strength signal.
    await tx.userSkill.upsert({
      where: { userId_skillId: { userId, skillId: skill.id } },
      update: { source: 'QUIZ' },
      create: { userId, skillId: skill.id, source: 'QUIZ' },
    });

    // One certification per user per skill, holding their BEST result — a
    // retake that scores lower leaves the existing credential alone. Without
    // this guard the upsert would happily downgrade someone for practising.
    const existing = await tx.certification.findUnique({
      where: { userId_skillId: { userId, skillId: skill.id } },
    });

    const certification =
      existing && existing.score >= result.score
        ? existing
        : await tx.certification.upsert({
            where: { userId_skillId: { userId, skillId: skill.id } },
            update: {
              attemptId: attempt.id,
              quizId: quiz.id,
              title: quiz.title,
              level: result.level,
              score: result.score,
              earnedAt: new Date(),
            },
            create: {
              userId,
              skillId: skill.id,
              attemptId: attempt.id,
              quizId: quiz.id,
              title: quiz.title,
              level: result.level,
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
  level: ProficiencyLevel;
  earnedAt: Date;
  shareSlug: string;
}): Certification {
  return {
    id: row.id,
    quizId: row.quizId ?? '',
    title: row.title,
    score: row.score,
    level: row.level,
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

// ── Quizzes ──────────────────────────────────────────────────────────────────
// Quizzes live in Postgres, seeded from data/quizzes/*.json. These two
// functions rebuild the discriminated union in @/types/quiz from the flat
// rows, so everything downstream (the runner, grading.ts, toPublicQuiz) is
// unchanged by the content having moved into the database.

const QUIZ_INCLUDE = {
  skill: { select: { slug: true } },
  questions: { orderBy: { order: 'asc' } },
} as const;

type QuizRow = {
  id: string;
  title: string;
  description: string;
  timeLimitSeconds: number | null;
  skill: { slug: string };
  questions: QuestionRow[];
};

type QuestionRow = {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'MULTI_SELECT' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  prompt: string;
  points: number;
  explanation: string | null;
  options: unknown;
  correctOptionId: string | null;
  correctOptionIds: string[];
  correctAnswer: boolean | null;
  acceptedAnswers: string[];
};

function toQuestion(row: QuestionRow): Question {
  const base = {
    id: row.id,
    prompt: row.prompt,
    points: row.points,
    explanation: row.explanation ?? undefined,
  };
  const options = (row.options ?? []) as QuizOption[];

  switch (row.type) {
    case 'MULTIPLE_CHOICE':
      return {
        ...base,
        type: 'multiple_choice',
        options,
        // The seed always writes this for a multiple-choice row; '' would make
        // every answer wrong rather than throw, so it fails loudly instead.
        correctOptionId: required(row.correctOptionId, row.id, 'correctOptionId'),
      };
    case 'MULTI_SELECT':
      return { ...base, type: 'multi_select', options, correctOptionIds: row.correctOptionIds };
    case 'TRUE_FALSE':
      return {
        ...base,
        type: 'true_false',
        correctAnswer: required(row.correctAnswer, row.id, 'correctAnswer'),
      };
    case 'SHORT_ANSWER':
      return { ...base, type: 'short_answer', acceptedAnswers: row.acceptedAnswers };
  }
}

function required<T>(value: T | null, questionId: string, column: string): T {
  if (value === null) {
    throw new Error(`Question "${questionId}" is missing ${column} — re-run the seed.`);
  }
  return value;
}

function toQuiz(row: QuizRow): Quiz {
  return {
    id: row.id,
    title: row.title,
    skillSlug: row.skill.slug,
    description: row.description,
    timeLimitSeconds: row.timeLimitSeconds ?? undefined,
    questions: row.questions.map(toQuestion),
  };
}

/** Every quiz, for the selection screen. */
export async function listQuizzes(): Promise<Quiz[]> {
  const rows = await prisma.quiz.findMany({ include: QUIZ_INCLUDE, orderBy: { id: 'asc' } });
  return rows.map(toQuiz);
}

/** One quiz by id (the JSON file stem), or null for the 404 path. */
export async function loadQuiz(quizId: string): Promise<Quiz | null> {
  const row = await prisma.quiz.findUnique({ where: { id: quizId }, include: QUIZ_INCLUDE });
  return row ? toQuiz(row) : null;
}

// ── Careers ──────────────────────────────────────────────────────────────────

const CAREER_INCLUDE = {
  careerSkills: { include: { skill: { select: { slug: true, name: true } } } },
} as const;

/**
 * Every career with its weighted skills, heaviest skill first.
 *
 * Unpaginated on purpose: it's 26 authored rows, and @/lib/careers/match wants
 * all of them to rank a profile against the full set. The sort is done here
 * rather than in the matcher so the "learn this next" ordering is already
 * right wherever the rows land.
 */
export async function listCareers(): Promise<Career[]> {
  const rows = await prisma.career.findMany({
    include: CAREER_INCLUDE,
    orderBy: { title: 'asc' },
  });

  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    field: row.field,
    description: row.description ?? undefined,
    skills: row.careerSkills
      .map((careerSkill) => ({
        slug: careerSkill.skill.slug,
        name: careerSkill.skill.name,
        weight: careerSkill.weight,
      }))
      .sort((a, b) => b.weight - a.weight),
  }));
}

// ── Jobs ─────────────────────────────────────────────────────────────────────
// Also seeded from JSON (data/jobs/listings.json). The required /
// nice-to-have split is stored as a flag on the join row and split back out
// here, so @/types/job is unchanged.

const JOB_INCLUDE = {
  skills: { include: { skill: { select: { slug: true } } } },
} as const;

type JobRow = {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  level: string;
  salaryRange: string | null;
  description: string;
  url: string | null;
  skills: { required: boolean; skill: { slug: string } }[];
};

function toJob(row: JobRow): Job {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    location: row.location,
    remote: row.remote,
    level: row.level as Job['level'],
    salaryRange: row.salaryRange ?? undefined,
    requiredSkills: row.skills.filter((s) => s.required).map((s) => s.skill.slug),
    niceToHaveSkills: row.skills.filter((s) => !s.required).map((s) => s.skill.slug),
    description: row.description,
    url: row.url ?? undefined,
  };
}

export async function listJobs(): Promise<Job[]> {
  const rows = await prisma.job.findMany({ include: JOB_INCLUDE, orderBy: { id: 'asc' } });
  return rows.map(toJob);
}

export async function getJob(id: string): Promise<Job | null> {
  const row = await prisma.job.findUnique({ where: { id }, include: JOB_INCLUDE });
  return row ? toJob(row) : null;
}

/** Join model output (which returns ids) back to full listings, order preserved. */
export async function jobsById(ids: string[]): Promise<Job[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.job.findMany({ where: { id: { in: ids } }, include: JOB_INCLUDE });
  const byId = new Map(rows.map((row) => [row.id, toJob(row)]));
  return ids.map((id) => byId.get(id)).filter((job): job is Job => Boolean(job));
}
