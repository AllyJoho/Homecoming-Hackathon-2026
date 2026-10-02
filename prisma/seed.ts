// @/prisma/seed.ts
// Seed script: console.log is the script's UI.
//
// Seeds the canonical skill vocabulary (so the Skill table matches
// lib/profile/skills.ts) plus a couple of demo users. Quizzes and job
// listings are NOT seeded — they're JSON under data/ and need no database.

import { PrismaClient } from '@/lib/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { CANONICAL_SKILLS } from '@/lib/profile/skills';

// Standalone script, so it opens its own adapter rather than importing the
// app's shared client.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Upserts on a unique key, so re-running the seed is idempotent.
  for (const skill of CANONICAL_SKILLS) {
    await prisma.skill.upsert({
      where: { slug: skill.slug },
      update: { name: skill.name, category: skill.category },
      create: { slug: skill.slug, name: skill.name, category: skill.category },
    });
  }
  console.log(`  ✔ ${CANONICAL_SKILLS.length} canonical skills`);

  const users = [
    { name: 'Michelle Johanson', email: 'mjohans0@byu.edu' },
    { name: 'Rubber Duck', email: 'duck@byu.edu' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: u,
    });
    console.log(`  ✔ User: ${u.name}`);
  }

  // Give the first demo user a couple of self-reported skills so the
  // recommendations page has something to rank on a fresh database.
  const demo = await prisma.user.findUnique({ where: { email: 'mjohans0@byu.edu' } });
  if (demo) {
    for (const slug of ['javascript', 'html-css']) {
      const skill = await prisma.skill.findUnique({ where: { slug } });
      if (!skill) continue;
      await prisma.userSkill.upsert({
        where: { userId_skillId: { userId: demo.id, skillId: skill.id } },
        update: {},
        create: { userId: demo.id, skillId: skill.id, source: 'SELF_REPORTED' },
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
