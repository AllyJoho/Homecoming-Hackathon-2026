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

# Our Plan

Hackathon prompt: **create something that improves the job hunt.**
Time limit: **8 hours**. Team: **4 people**. Goal: **creativity**.

## The Idea

A website where users take short quizzes on programming languages and software engineering topics, get scored, and earn a certificate with a proficiency level. A job search page then shows job titles along with the skills (quizzes) each one requires, so users can see how ready they are for each role.

## Stack

- Next.js
- TypeScript
- Prisma
- Postgres

## How Quizzes Work

- Each quiz has **15 questions**.
- The result is a **percentage**.
- The percentage maps to one of four levels: **Beginner, Intermediate, Proficient, Advanced**.
- The level is printed on the **certificate**.
- Each certificate is **viewable by link**.
- Would like the certificate available as a **PDF**.

## Screens

| Screen | Notes |
| --- | --- |
| Home | Section with the user's certificates from quizzes taken, and a section with the available skill quizzes (this section is where users pick a quiz; there is no separate quiz selection page) |
| Login / Logout | Very simple, email only |
| Quiz questions | The 15-question quiz |
| Results | Percentage and level, with link to the certificate |
| View certificate | Accessible by link |
| Job search | List of job titles; each lists its required skills/quizzes with links |

### Job Search Page

- A list of job titles.
- Under each title, the skills/quizzes required for that job, linking to each quiz.
- If the user has already taken a quiz, its link is **color coded** by the level they earned (Beginner, Intermediate, Proficient, or Advanced).

## MVP

**Basic quiz**
- Home screen (includes quiz selection)
- Result screen / certificate with link
  - Would like the certificate as a PDF

**Job search part**
- Quiz history
- A place to enter skills/things there isn't a quiz for, or the job you want
- AI ideas from the original notes (how we use AI has not been agreed yet):
  - [ ] Give feedback based on the job you want
  - [ ] Tell you what job fits what you want
  - [ ] Maybe look up job openings

## Stretch Goals

- Filter the job search page by how good a fit the user is, based on the quizzes they have taken and the level they earned on each
- Personalized feedback on the results page
- Pull specific job openings from the internet for each job title

## Open Questions

- Percentage cutoffs for each level
- Where quiz questions come from (written by hand, AI generated, or both) and which quizzes we launch with
- Which job titles and skill requirements we include
- Who owns which screen
- How we incorporate AI into the project