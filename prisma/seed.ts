// @/prisma/seed.ts
// Seed script: console.log is the script's UI.

import { PrismaClient } from '@/lib/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Standalone script, so it opens its own adapter rather than importing the
// app's shared client.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Upserts on a unique key, so re-running the seed is idempotent.
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
