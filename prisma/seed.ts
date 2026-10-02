// @/prisma/seed.ts
// Run:  npm run db:seed
// The seed command is wired up in prisma.config.ts (Prisma 7 moved it there
// from package.json's "prisma" block).
//
// Safe to re-run: skills and careers upsert by slug, and each career's skill
// weights are replaced from the JSON so edits there take effect.
//
// Quizzes are NOT seeded — they're authored as JSON in data/quizzes/ and read
// at runtime by lib/quiz/loadQuiz.ts, so they need no database rows.
// Seed script: console.log is the script's UI.

import { PrismaClient } from '@/lib/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CANONICAL_SKILLS } from '@/lib/profile/skills';

// Standalone script, so it opens its own adapter rather than importing the
// app's shared client.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const DATA_DIR = join(process.cwd(), 'data');

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
  // lib/profile/skills.ts is the single source of truth for the vocabulary:
  // normalizeSkill() rejects anything outside it, so the table has to match.
  const skillIdBySlug = new Map<string, string>();
  for (const skill of CANONICAL_SKILLS) {
    const row = await prisma.skill.upsert({
      where: { slug: skill.slug },
      update: { name: skill.name, category: skill.category },
      create: { slug: skill.slug, name: skill.name, category: skill.category },
    });
    skillIdBySlug.set(skill.slug, row.id);
  }
  console.log(`  ✔ ${CANONICAL_SKILLS.length} canonical skills`);

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
            `skill slug. Add it to CANONICAL_SKILLS in lib/profile/skills.ts.`,
        );
      }
      return { careerId: career.id, skillId, weight: Math.min(5, Math.max(1, Math.round(cs.weight))) };
    });

    await prisma.careerSkill.createMany({ data: links });
  }
  console.log(`  ✔ ${careers.length} careers`);

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
    for (const slug of ['javascript', 'html-css']) {
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
