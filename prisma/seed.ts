// @/prisma/seed.ts
// Run:  npm run db:seed
// The seed command is wired up in prisma.config.ts (Prisma 7 moved it there
// from package.json's "prisma" block).
//
// Safe to re-run: skills and careers upsert by slug, and each career's skill
// weights are replaced from the JSON so edits there take effect.
//
// Everything in data/ ends up in Postgres: skills, careers, quizzes (with
// their questions) and job listings. Quiz and job content is replaced wholesale
// on every run, so editing a JSON file and re-seeding is the authoring loop.
// Seed script: console.log is the script's UI.

import { PrismaClient } from '@/lib/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import skills from '@/data/skills.json';
import type { QuestionType } from '@/lib/generated/prisma/enums';

// Standalone script, so it opens its own adapter rather than importing the
// app's shared client.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const DATA_DIR = join(process.cwd(), 'data');

type SkillJson = { slug: string; name: string; category?: string; description?: string };

type QuizJson = {
  id: string;
  title: string;
  skillSlug: string;
  description: string;
  passingScore: number;
  timeLimitSeconds?: number;
  questions: QuestionJson[];
};

type QuestionJson = {
  id: string;
  type: 'multiple_choice' | 'multi_select' | 'true_false' | 'short_answer';
  prompt: string;
  points?: number;
  explanation?: string;
  difficulty?: string;
  options?: { id: string; text: string }[];
  correctOptionId?: string;
  correctOptionIds?: string[];
  correctAnswer?: boolean;
  acceptedAnswers?: string[];
};

type JobJson = {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  level: string;
  salaryRange?: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  description: string;
  url?: string;
};

// The JSON spells question types in snake_case; the enum is SCREAMING_SNAKE.
const QUESTION_TYPES: Record<QuestionJson['type'], QuestionType> = {
  multiple_choice: 'MULTIPLE_CHOICE',
  multi_select: 'MULTI_SELECT',
  true_false: 'TRUE_FALSE',
  short_answer: 'SHORT_ANSWER',
};

type CareerJson = {
  slug: string;
  title: string;
  field: string;
  description?: string;
  skills: { skill: string; weight: number }[];
};

function readJson<T>(path: string): T {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch (e) {
    throw new Error(`Could not read/parse ${path}: ${(e as Error).message}`);
  }
}

async function main() {
  console.log('🌱 Seeding database...');

  // ── Skills ───────────────────────────────────────────────
  // data/skills.json is the single source of truth for the vocabulary — the
  // normalizer in lib/profile/skills.ts reads the same file, so the table and
  // the accepted input set can't drift apart.
  const skillIdBySlug = new Map<string, string>();
  for (const skill of skills as SkillJson[]) {
    const row = await prisma.skill.upsert({
      where: { slug: skill.slug },
      update: { name: skill.name, category: skill.category, description: skill.description },
      create: {
        slug: skill.slug,
        name: skill.name,
        category: skill.category,
        description: skill.description,
      },
    });
    skillIdBySlug.set(skill.slug, row.id);
  }
  // Drop rows that left the vocabulary. Without this an edited skills.json
  // leaves orphans behind that normalizeSkill() rejects as input but that are
  // already attached to profiles. The FKs cascade, so anything earned against
  // a removed skill goes with it — that's the intended reading of "this skill
  // no longer exists", and it's why the count is logged.
  const pruned = await prisma.skill.deleteMany({
    where: { slug: { notIn: (skills as SkillJson[]).map((s) => s.slug) } },
  });
  console.log(`  ✔ ${skills.length} canonical skills` + (pruned.count ? ` (pruned ${pruned.count} no longer in data/skills.json)` : ''));

  // ── Careers ──────────────────────────────────────────────
  const careers = readJson<CareerJson[]>(join(DATA_DIR, 'careers.json'));
  for (const c of careers) {
    const career = await prisma.career.upsert({
      where: { slug: c.slug },
      update: { title: c.title, field: c.field, description: c.description },
      create: { slug: c.slug, title: c.title, field: c.field, description: c.description },
    });

    // Replace this career's skill links so edits to the JSON take effect.
    await prisma.careerSkill.deleteMany({ where: { careerId: career.id } });

    const links = c.skills.map((cs) => {
      const skillId = skillIdBySlug.get(cs.skill);
      if (!skillId) {
        throw new Error(
          `Career "${c.slug}" references "${cs.skill}", which is not a canonical ` +
            `skill slug. Add it to data/skills.json.`,
        );
      }
      return { careerId: career.id, skillId, weight: Math.min(5, Math.max(1, Math.round(cs.weight))) };
    });

    await prisma.careerSkill.createMany({ data: links });
  }
  // Same pruning as skills: a career dropped from the JSON should disappear
  // rather than linger. Nothing but CareerSkill points at it, so this is safe.
  const prunedCareers = await prisma.career.deleteMany({
    where: { slug: { notIn: careers.map((c) => c.slug) } },
  });
  console.log(
    `  ✔ ${careers.length} careers` +
      (prunedCareers.count ? ` (pruned ${prunedCareers.count} no longer in data/careers.json)` : ''),
  );

  // ── Quizzes ──────────────────────────────────────────────
  // Replaced wholesale so edits to the JSON take effect. Questions cascade
  // from Quiz, and no user data points at either by foreign key.
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();

  const quizDir = join(DATA_DIR, 'quizzes');
  const quizFiles = readdirSync(quizDir).filter((f) => f.endsWith('.json'));
  let questionCount = 0;

  for (const file of quizFiles) {
    const quiz = readJson<QuizJson>(join(quizDir, file));
    const skillId = skillIdBySlug.get(quiz.skillSlug);
    if (!skillId) {
      throw new Error(
        `Quiz "${file}" has skillSlug "${quiz.skillSlug}", which is not in ` +
          `data/skills.json.`,
      );
    }

    // The file stem is the quiz id the rest of the app refers to, so it has to
    // agree with the `id` inside the file.
    const stem = file.replace(/\.json$/, '');
    if (quiz.id !== stem) {
      throw new Error(`Quiz "${file}" declares id "${quiz.id}" but its filename says "${stem}".`);
    }

    await prisma.quiz.create({
      data: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        passingScore: quiz.passingScore,
        timeLimitSeconds: quiz.timeLimitSeconds ?? null,
        skillId,
        questions: {
          create: quiz.questions.map((q, i) => ({
            id: q.id,
            skillId,
            order: i,
            type: QUESTION_TYPES[q.type],
            prompt: q.prompt,
            points: q.points ?? 1,
            explanation: q.explanation ?? null,
            difficulty: q.difficulty ?? null,
            // Authored content is trusted: it's reviewed by whoever wrote the
            // file, so it counts for certification immediately.
            reviewed: true,
            options: q.options ?? undefined,
            correctOptionId: q.correctOptionId ?? null,
            correctOptionIds: q.correctOptionIds ?? [],
            correctAnswer: q.correctAnswer ?? null,
            acceptedAnswers: q.acceptedAnswers ?? [],
          })),
        },
      },
    });
    questionCount += quiz.questions.length;
    console.log(`  ✔ Quiz ${quiz.id}: ${quiz.questions.length} questions`);
  }
  console.log(`  ✔ ${quizFiles.length} quizzes, ${questionCount} questions`);

  // ── Jobs ─────────────────────────────────────────────────
  await prisma.jobSkill.deleteMany();
  await prisma.job.deleteMany();

  const jobs = readJson<JobJson[]>(join(DATA_DIR, 'jobs', 'listings.json'));
  for (const j of jobs) {
    // required and nice-to-have collapse into one join table with a flag.
    // A slug in both lists keeps the stronger (required) reading.
    const links = new Map<string, boolean>();
    for (const slug of j.niceToHaveSkills) links.set(slug, false);
    for (const slug of j.requiredSkills) links.set(slug, true);

    const skillLinks = [...links].map(([slug, required]) => {
      const skillId = skillIdBySlug.get(slug);
      if (!skillId) {
        throw new Error(
          `Job "${j.id}" references "${slug}", which is not in data/skills.json.`,
        );
      }
      return { skillId, required };
    });

    await prisma.job.create({
      data: {
        id: j.id,
        title: j.title,
        company: j.company,
        location: j.location,
        remote: j.remote,
        level: j.level,
        salaryRange: j.salaryRange ?? null,
        description: j.description,
        url: j.url ?? null,
        skills: { create: skillLinks },
      },
    });
  }
  console.log(`  ✔ ${jobs.length} job listings`);

  // ── Demo users ───────────────────────────────────────────
  const users = [
    { name: 'Michelle Johanson', email: 'mjohans0@byu.edu' },
    { name: 'Rubber Duck', email: 'duck@byu.edu' },
  ];
  for (const u of users) {
    await prisma.user.upsert({ where: { email: u.email }, update: {}, create: u });
    console.log(`  ✔ User: ${u.name}`);
  }

  // Give the first demo user a couple of self-reported skills so the
  // recommendations page has something to rank on a fresh database.
  const demo = await prisma.user.findUnique({ where: { email: 'mjohans0@byu.edu' } });
  if (demo) {
    for (const slug of ['javascript-fundamentals', 'html-css-fundamentals']) {
      const skillId = skillIdBySlug.get(slug);
      if (!skillId) continue;
      await prisma.userSkill.upsert({
        where: { userId_skillId: { userId: demo.id, skillId } },
        update: {},
        create: { userId: demo.id, skillId, source: 'SELF_REPORTED' },
      });
    }
    console.log('  ✔ Demo skills for Michelle');
  }

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
