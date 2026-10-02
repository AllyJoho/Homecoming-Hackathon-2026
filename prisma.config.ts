// @/prisma.config.ts
// `prisma.config.ts` disables Prisma's automatic env loading, so we load .env
// ourselves. dotenv alone does NOT expand ${VAR} references: dotenv-expand
// adds that, matching the behavior Next.js and docker-compose already use.
import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';
expand(dotenv.config());

import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
