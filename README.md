# Homecoming-Hackathon-2026
This is the repository that the Rubber Duck team is using for our project in the BYU Homecoming 2026 Hackathon

## Stack

Next.js 16 (App Router) · React 19 · Tailwind 4 · Prisma 7 · Postgres 16

Prisma 7 ships no Rust query engine, so the database connection is opened by the
`@prisma/adapter-pg` driver adapter in `lib/prisma.ts` rather than by a `url` in
the schema's datasource block. The client is generated into `lib/generated/prisma`
(gitignored — `npm install` regenerates it via `postinstall`).

## Local setup

```bash
cp .env.example .env     # defaults work as-is for local dev
npm install              # also runs `prisma generate`
npm run db:up            # starts Postgres in Docker (needs Docker Desktop running)
npm run db:migrate       # applies migrations
npm run db:seed          # optional: a couple of sample rows
npm run dev
```

Postgres is published on host port **5433**, not 5432, so it doesn't collide
with any other local Postgres.

## Database scripts

| Command | What it does |
| --- | --- |
| `npm run db:up` / `db:down` | start / stop the Postgres container |
| `npm run db:migrate` | create + apply a migration from schema changes |
| `npm run db:seed` | run `prisma/seed.ts` (idempotent — upserts) |
| `npm run db:studio` | open Prisma Studio to browse the data |
| `npm run db:reset` | drop, re-migrate, and re-seed |

## Changing the schema

Edit `prisma/schema.prisma`, then:

```bash
npm run db:migrate -- --name what_you_changed
```

That regenerates the client too, so new models are typed immediately. Query from
the shared client — never construct a second `PrismaClient`:

```ts
import { prisma } from '@/lib/prisma';

const users = await prisma.user.findMany();
```

The `User` model in the schema is a placeholder to get the pipeline working —
replace it once we settle on the actual domain.
