# Homecoming-Hackathon-2026
This is the repository that the Rubber Duck team is using for our project in the BYU Homecoming 2026 Hackathon

## Stack

Next.js 16 (App Router) · React 19 · Tailwind 4 · Prisma 7 · Postgres 16

Prisma 7 ships no Rust query engine, so the database connection is opened by the
`@prisma/adapter-pg` driver adapter in `lib/db/client.ts` rather than by a `url` in
the schema's datasource block. The client is generated into `lib/generated/prisma`
(gitignored — `npm install` regenerates it via `postinstall`).

## Local setup

```bash
nvm use                  # Node 22 — Prisma 7 needs 20.19+, 22.12+, or 24+
cp .env.example .env     # defaults work as-is for local dev
npm install              # also runs `prisma generate`
npm run db:up            # starts Postgres in Docker (needs Docker Desktop running)
npm run db:migrate -- --name domain_models   # see note below
npm run db:seed          # canonical skills + two demo users
npm run dev
```

Postgres is published on host port **5433**, not 5432, so it doesn't collide
with any other local Postgres.

> **One-time step:** the schema has the real domain models (`Skill`,
> `UserSkill`, `QuizAttempt`, `Certification`) but the committed migration is
> still the original `init`. The first person to run `db:migrate` generates the
> migration for them and commits it; everyone after that just runs
> `npm run db:migrate`.

The AI job-matching feature needs an Anthropic API key:

```bash
echo 'ANTHROPIC_API_KEY=sk-ant-...' >> .env
```

Without it the app runs fine — `/recommendations` reports that the key is
missing instead of failing.

## Database scripts

| Command | What it does |
| --- | --- |
| `npm run db:up` / `db:down` | start / stop the Postgres container |
| `npm run db:migrate` | create + apply a migration from schema changes |
| `npm run db:seed` | run `prisma/seed.ts` (idempotent — upserts) |
| `npm run db:studio` | open Prisma Studio to browse the data |
| `npm run db:reset` | drop, re-migrate, and re-seed |


## Project layout

Application code sits at the repo root, with `app/` reserved for routing. This
is the ["store project files outside of
`app`"](https://nextjs.org/docs/app/getting-started/project-structure#store-project-files-outside-of-app)
strategy from the Next.js docs. (A `src/` folder is also supported — the docs
list it as an "Optional application source folder" — but we're not using it.
Next.js is explicitly unopinionated here; the only rule that matters is being
consistent.) The `@/*` path alias points at the repo root, so `@/lib/db/client`
is `lib/db/client.ts`.

```
app/                       # routes only — no business logic
  (auth)/login/            # no app nav: signed-out visitors see links they can't use
  (main)/                  # everything behind the session guard in its layout.tsx
  api/                     # route handlers (the trust boundary — see below)
components/
  ui/                      # Button, Card, Modal, Tag — the only barrel (index.ts)
  quiz/questions/          # one component per question type + the registry
  skills/ certifications/ recommendations/ certificate/
lib/
  auth/session.ts          # ⚠️ placeholder auth — read the warning in that file
  db/                      # client.ts (shared Prisma) + queries.ts (every query)
  quiz/                    # grading.ts, scoring.ts, loadQuiz.ts
  profile/                 # skills.ts (canonical vocabulary), buildProfile.ts
  jobs/                    # listings.ts (seeded data), recommend.ts (the AI call)
  ai/                      # client.ts (Anthropic SDK), prompts.ts
data/
  quizzes/*.json           # quiz content — add a file, no migration needed
  jobs/listings.json       # 20 seeded listings
types/                     # quiz.ts, profile.ts, job.ts
prisma/                    # schema.prisma, migrations, seed.ts
```

Two conventions worth keeping:

- **Routes don't hold logic.** `app/` files read the session, call something in
  `lib/`, and render. Anything worth unit-testing lives in `lib/`.
- **Quiz answers never reach the browser.** Pages load a quiz server-side and
  pass it through `toPublicQuiz()`, which strips `correctOptionId`,
  `acceptedAnswers`, and `explanation`. Grading happens in
  `app/api/quizzes/[quizId]/submit/route.ts` — nothing the client posts can
  change a score.

## Adding things

| To add… | Touch |
| --- | --- |
| A quiz | one JSON file in `data/quizzes/`, then a line in `QUIZ_MODULES` (`lib/quiz/loadQuiz.ts`) |
| A question type | `Question` union in `types/quiz.ts`, a case in `lib/quiz/grading.ts`, a component in `components/quiz/questions/` + the registry there |
| A skill | `CANONICAL_SKILLS` in `lib/profile/skills.ts` (plus aliases), then `npm run db:seed` |
| A job listing | `data/jobs/listings.json` — skill slugs must be canonical |

## The AI call

`lib/jobs/recommend.ts` is the only place that calls Claude for matching.
It uses structured outputs (a zod schema via `zodOutputFormat`), so the
response is schema-valid or it fails loudly — there's no prose parsing. The
prompt text is kept separately in `lib/ai/prompts.ts` because it's the part
that gets tuned most.

Listings are pre-filtered by `shortlistJobs()` before the model sees them: the
deterministic part (skill-slug overlap) is cheap, so the model only spends
tokens on the judgment part.

## Changing the schema

Edit `prisma/schema.prisma`, then:

```bash
npm run db:migrate -- --name what_you_changed
```

That regenerates the client too, so new models are typed immediately. Query
through `lib/db/queries.ts` rather than importing `prisma` into a route —
the certificate award is a transaction, and it should only exist once.
