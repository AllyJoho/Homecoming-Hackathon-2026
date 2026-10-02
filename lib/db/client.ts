// @/lib/db/client.ts
// Shared Prisma client instance, reused across hot reloads in dev to avoid too
// many database connections.

import { PrismaClient } from '@/lib/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma 7 ships no Rust query engine, so the connection is opened by a driver
// adapter here rather than read from a `url` in the schema's datasource block.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter, log: ['error', 'warn'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
