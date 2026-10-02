// @/prisma/seed.ts
// Run:  npm run db:seed
// The seed command is wired up in prisma.config.ts (Prisma 7 moved it there
// from package.json's "prisma" block).
//
// Safe to re-run: skills and careers upsert by slug, and each career's skill
// weights are replaced from the JSON so edits there take effect.
//
// Everything in data/ ends up in Postgres: skills, careers, and quizzes with
// their questions. Quiz content is replaced wholesale on every run, so editing
// a JSON file and re-seeding is the authoring loop.
//
// What this script does NOT write is per-user profile data. The demo accounts
// are created with credentials and nothing else — no skills, resume, or
// experience — so a fresh database starts every account at onboarding.
//
// Job listings are not authored: they're ingested from real job boards by
// `npm run jobs:ingest`, which caches what it extracted to
// data/jobs/ingested.json. This script replays that cache, so a db:reset
// doesn't throw away work the AI was paid to do.
// Seed script: console.log is the script's UI.

import { PrismaClient } from '@/lib/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import skills from '@/data/skills.json';
import { readJobCache } from '@/lib/jobs/cache';
import type { QuestionType } from '@/lib/generated/prisma/enums';
import { auth } from '@/lib/auth/server';

// Standalone script, so it opens its own adapter rather than importing the
// app's shared client.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const DATA_DIR = join(process.cwd(), 'data');

// The demo accounts get a real password so the credential path can be tested,
// not just the one-click button. Not a secret: these accounts only exist in a
// seeded dev database, and the demo-login endpoint is absent in production.
const DEMO_PASSWORD = 'demo-password-123';

type SkillJson = { slug: string; name: string; category?: string; description?: string };

type QuizJson = {
  id: string;
  title: string;
  skillSlug: string;
  description: string;
  timeLimitSeconds?: number;
  questions: QuestionJson[];
};

type QuestionJson = {
  id: string;
  type:
    | 'multiple_choice'
    | 'multi_select'
    | 'true_false'
    | 'short_answer'
    | 'find_the_bug'
    | 'order_lines';
  prompt: string;
  code?: { language: string; source: string };
  points?: number;
  explanation?: string;
  difficulty?: string;
  options?: { id: string; text: string }[];
  correctOptionId?: string;
  correctOptionIds?: string[];
  correctAnswer?: boolean;
  acceptedAnswers?: string[];
  bugLines?: number[];
  /** order_lines only, authored in the correct order. Stored in `options`. */
  lines?: { id: string; text: string }[];
};

// The JSON spells question types in snake_case; the enum is SCREAMING_SNAKE.
const QUESTION_TYPES: Record<QuestionJson['type'], QuestionType> = {
  multiple_choice: 'MULTIPLE_CHOICE',
  multi_select: 'MULTI_SELECT',
  true_false: 'TRUE_FALSE',
  short_answer: 'SHORT_ANSWER',
  find_the_bug: 'FIND_THE_BUG',
  order_lines: 'ORDER_LINES',
};

/**
 * Catch authoring mistakes in the two newer types at seed time. A bug line
 * past the end of the snippet would otherwise make the question impossible to
 * get right, silently.
 */
function validateQuestion(file: string, q: QuestionJson) {
  const where = `${file} → ${q.id}`;
  if (q.type === 'find_the_bug') {
    if (!q.code) throw new Error(`${where}: find_the_bug needs a "code" snippet.`);
    if (!q.bugLines?.length) throw new Error(`${where}: find_the_bug needs "bugLines".`);
    const lineCount = q.code.source.replace(/\n+$/, '').split('\n').length;
    const outOfRange = q.bugLines.filter((n) => n < 1 || n > lineCount);
    if (outOfRange.length) {
      throw new Error(`${where}: bugLines ${outOfRange.join(', ')} not in 1–${lineCount}.`);
    }
  }
  if (q.type === 'order_lines' && (q.lines?.length ?? 0) < 2) {
    throw new Error(`${where}: order_lines needs at least 2 "lines".`);
  }
}

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

    for (const q of quiz.questions) validateQuestion(file, q);

    await prisma.quiz.create({
      data: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        timeLimitSeconds: quiz.timeLimitSeconds ?? null,
        skillId,
        questions: {
          create: quiz.questions.map((q, i) => ({
            id: q.id,
            skillId,
            order: i,
            type: QUESTION_TYPES[q.type],
            prompt: q.prompt,
            code: q.code?.source ?? null,
            codeLanguage: q.code?.language ?? null,
            points: q.points ?? 1,
            explanation: q.explanation ?? null,
            difficulty: q.difficulty ?? null,
            // Authored content is trusted: it's reviewed by whoever wrote the
            // file, so it counts for certification immediately.
            reviewed: true,
            options: q.options ?? q.lines ?? undefined,
            correctOptionId: q.correctOptionId ?? null,
            correctOptionIds: q.correctOptionIds ?? [],
            correctAnswer: q.correctAnswer ?? null,
            acceptedAnswers: q.acceptedAnswers ?? [],
            bugLines: q.bugLines ?? [],
          })),
        },
      },
    });
    questionCount += quiz.questions.length;
    console.log(`  ✔ Quiz ${quiz.id}: ${quiz.questions.length} questions`);
  }
  console.log(`  ✔ ${quizFiles.length} quizzes, ${questionCount} questions`);

  // ── Jobs ─────────────────────────────────────────────────
  // Restored from data/jobs/ingested.json, which `npm run jobs:ingest` writes
  // every run. NOT authored content — these are real listings pulled from job
  // boards, and the file is a cache of the AI extraction that turned each
  // description into weighted skill slugs.
  //
  // The restore exists because a `db:reset` once dropped 64 extracted listings
  // and the only way back was to pay for the extraction again. Replaying the
  // cache costs nothing and works with no network.
  //
  // Jobs already present are left alone and the cache is merged over them, so
  // re-seeding never destroys a listing ingested since the file was written.
  const cachedJobs = readJobCache();

  if (cachedJobs.length === 0) {
    console.log('  – no job cache; run `npm run jobs:ingest` to pull listings');
  } else {
    for (const job of cachedJobs) {
      const links = job.skills.flatMap(({ slug, weight, required }) => {
        const skillId = skillIdBySlug.get(slug);
        // A slug that left data/skills.json shouldn't fail the whole seed —
        // the listing is still worth having without that one link.
        return skillId ? [{ skillId, weight, required }] : [];
      });

      const fields = {
        title: job.title,
        company: job.company,
        location: job.location,
        remote: job.remote,
        level: job.level,
        salaryRange: job.salaryRange ?? null,
        description: job.description,
        url: job.url ?? null,
      };

      await prisma.job.upsert({
        where: { id: job.id },
        update: fields,
        create: { id: job.id, ...fields },
      });
      await prisma.jobSkill.deleteMany({ where: { jobId: job.id } });
      if (links.length > 0) {
        await prisma.jobSkill.createMany({
          data: links.map((link) => ({ jobId: job.id, ...link })),
        });
      }
    }
    console.log(`  ✔ ${cachedJobs.length} job listings restored from cache`);
  }

  // ── Demo users ───────────────────────────────────────────
  // Created through Better Auth rather than with a plain prisma.create, so the
  // password is scrypt-hashed onto Account.password the same way a real
  // sign-up would be — there's no second code path that writes credentials.
  // `isDemo` is what the demo-login endpoint checks before issuing a session.
  const users = [
    { name: 'Michelle Johanson', email: 'mjohans0@byu.edu' },
    { name: 'Rubber Duck', email: 'duck@byu.edu' },
  ];
  // Hashed with Better Auth's own hasher, so the stored credential is byte-for
  // byte what a real sign-up produces. Upserting the row rather than
  // re-creating it keeps any skills and certifications the account already has.
  const hashed = await (await auth.$context).password.hash(DEMO_PASSWORD);

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { isDemo: true, name: u.name },
      create: { email: u.email, name: u.name, isDemo: true },
    });

    // Better Auth looks up a password login by providerId 'credential', with
    // accountId set to the user id.
    const credential = await prisma.account.findFirst({
      where: { userId: user.id, providerId: 'credential' },
    });
    if (credential) {
      await prisma.account.update({ where: { id: credential.id }, data: { password: hashed } });
    } else {
      await prisma.account.create({
        data: {
          id: randomUUID(),
          accountId: user.id,
          providerId: 'credential',
          userId: user.id,
          password: hashed,
        },
      });
    }
    console.log(`  ✔ User: ${u.name} (${credential ? 'password reset' : 'credential created'})`);
  }

  // No per-user profile data is seeded: no skills, no resume, no experience.
  // A demo account starts empty, the same as any account created through
  // sign-up, so the first thing you see is the real onboarding path rather
  // than someone else's profile. Skills come from the resume paste, the skill
  // board, or a quiz.

  console.log(`✅ Seed complete. Demo accounts sign in with password "${DEMO_PASSWORD}".`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
