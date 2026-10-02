# Setup and project layout

Everything you need to run the app locally, plus where things live and why.
The product spec is in [the README](../README.md).

Every command and row count on this page was run against the current `main`.

## Prerequisites

| | |
| --- | --- |
| **Node 22** | Prisma 7 refuses to install on Node 21 — it needs 20.19+, 22.12+, or 24+. `nvm use` picks up the version in `.nvmrc` (22.22.0). If `npm install` dies in `postinstall`, this is why. |
| **Docker Desktop** | Must be *running* before `npm run db:up`. |
| **Anthropic API key** | Optional. Only `/recommendations` uses it; without it that page reports the missing key and the rest of the app is unaffected. |

## First run

```bash
nvm use                  # Node 22
cp .env.example .env     # defaults work as-is for local dev
npm install              # also runs `prisma generate` via postinstall
npm run db:up            # starts Postgres in Docker
npm run db:migrate       # applies the 4 migrations
npm run db:seed          # loads data/ into Postgres
npm run dev
```

Postgres is published on host port **5433**, not 5432, so it doesn't collide
with another local Postgres you may already be running.

A successful seed prints:

```
✔ 46 canonical skills
✔ 26 careers
✔ Quiz agile-scrum: 5 questions
...
✔ 46 quizzes, 250 questions
✔ User: Michelle Johanson (credential created)
✔ User: Rubber Duck (credential created)
```

The seed is idempotent — it upserts, and prunes skills and careers that are no
longer in the JSON. Re-run it as often as you like.

Two things it deliberately does not write:

- **Job listings.** They come from real job boards via `npm run jobs:ingest`,
  not from a JSON file.
- **Per-user profile data.** The demo accounts are created with a password and
  nothing else — no skills, resume, or experience — so every account starts at
  onboarding. Skills arrive the way a real user's do: a pasted resume, the
  skill board, or a quiz.

## How data flows

This is the one thing worth understanding before you change anything:

```
data/*.json  ──`npm run db:seed`──▶  Postgres  ──`prisma/queries.ts`──▶  pages & route handlers
```

**The app reads the database, not the JSON files.** Editing a quiz, a job, a
career or the skill list has no effect until you re-run `npm run db:seed`. That
catches everyone once.

The one exception: `lib/profile/skills.ts` imports `data/skills.json` directly,
because normalizing free text ("JS" → `javascript-fundamentals`) has to work
without a database round trip. So `data/skills.json` is both the seed for the
`Skill` table *and* the runtime vocabulary.

## Project layout

Application code sits at the repo root, with `app/` reserved for routing —
the ["store project files outside of
`app`"](https://nextjs.org/docs/app/getting-started/project-structure#store-project-files-outside-of-app)
strategy from the Next.js docs. The `@/*` path alias points at the repo root,
so `@/prisma/queries` is `prisma/queries.ts`.

```
app/                        # routes only — no business logic
  (auth)/login/             # no app nav: a signed-out visitor sees no dead links
  (main)/                   # everything behind the session guard in its layout.tsx
    quizzes/[quizId]/       # the runner, and results/ beneath it
    certificates/[certId]/  # by shareSlug, not by id
    recommendations/        # AI job matches
  api/                      # route handlers — the trust boundary (see below)
components/
  ui/                       # Button, Card, Modal, Tag — the only barrel (index.ts)
  quiz/questions/           # one component per question type + the registry
  skills/ certifications/ recommendations/ certificate/
lib/
  auth/session.ts           # ⚠️ placeholder auth — read the warning in that file
  quiz/                     # grading.ts, scoring.ts, levels.ts, publicQuiz.ts
  profile/                  # skills.ts (vocabulary + normalizer), buildProfile.ts
  jobs/                     # shortlist.ts (deterministic), recommend.ts (the AI call)
  ai/                       # client.ts (Anthropic SDK), prompts.ts
prisma/
  client.ts                 # the PrismaClient instance — imported ONLY by queries.ts
  queries.ts                # every database read and write in the app
  schema.prisma  seed.ts  migrations/
data/                       # seed input, loaded by `npm run db:seed`
  skills.json               # 46 skills — the canonical vocabulary
  careers.json              # 26 careers
  quizzes/*.json            # one file per quiz, 15 questions each
types/                      # quiz.ts, profile.ts, job.ts — no Prisma types leak out
```

## Three conventions

- **Routes don't hold logic.** A file in `app/` reads the session, calls
  something in `lib/` or `prisma/queries.ts`, and renders. Anything worth
  unit-testing lives outside `app/`.
- **One way into the database.** `prisma/client.ts` is imported by
  `prisma/queries.ts` and nothing else, so the award-a-certificate transaction
  can't get half-copied into a route handler.
- **Answer keys never reach the browser.** Pages load a quiz server-side and
  pass it through `toPublicQuiz()` (`lib/quiz/publicQuiz.ts`), which strips
  `correctOptionId`, `correctOptionIds`, `correctAnswer`, `acceptedAnswers` and
  `explanation`. Grading happens in `app/api/quizzes/[quizId]/submit/route.ts`,
  so nothing the client posts can change a score.

## Routes

| Route | What it is |
| --- | --- |
| `/` | Home — skills and earned certificates |
| `/login` | Email-only sign-in (see the auth warning below) |
| `/quizzes` | Quiz selection |
| `/quizzes/[quizId]` | The 15-question runner |
| `/quizzes/[quizId]/results` | Score, level, per-question review |
| `/certificates/[certId]` | Certificate by `shareSlug` |
| `/recommendations` | AI-ranked job matches |
| `/api/auth/[...auth]` | `POST /api/auth/login` and `/logout` |
| `/api/skills` | `POST` add a skill, `DELETE ?slug=` remove one |
| `/api/quizzes/[quizId]/submit` | Grades a submission, awards the certificate |
| `/api/recommendations` | Builds the profile, calls Claude |
| `/api/results/[resultId]/feedback` | AI coaching on a finished attempt |

## Database scripts

| Command | What it does |
| --- | --- |
| `npm run db:up` / `db:down` | start / stop the Postgres container |
| `npm run db:migrate` | apply migrations, and create one if the schema changed |
| `npm run db:seed` | load `data/` into Postgres (idempotent) |
| `npm run db:studio` | browse the data in Prisma Studio |
| `npm run db:reset` | drop, re-migrate, re-seed |

## Adding things

| To add… | Touch |
| --- | --- |
| A quiz | one JSON file in `data/quizzes/`, then `npm run db:seed` |
| A question | append to that quiz's `questions` array, then re-seed. Ids are `<quiz>-<n>` and array order is the display order |
| A question type | the `Question` union in `types/quiz.ts`, a case in `lib/quiz/grading.ts`, a component in `components/quiz/questions/` + the registry there, and `QuestionType` in `prisma/schema.prisma` |
| A skill | `data/skills.json`, then re-seed. Quiz `skillSlug` and job `requiredSkills` must use these slugs or the seed throws |
| A career | `data/careers.json`, then re-seed |
| A job listing | not authored — `npm run jobs:ingest` pulls real ones |

## Changing the schema

Edit `prisma/schema.prisma`, then:

```bash
npm run db:migrate -- --name what_you_changed
```

That regenerates the typed client too, so new fields are typed immediately.
Commit the generated migration directory — a teammate who only pulls the schema
will have a database that silently disagrees with it.

## Known rough edges

- **Auth is a placeholder.** `lib/auth/session.ts` stores a bare user id in an
  unsigned cookie, and `/login` takes an email with no password or
  verification. It exists so the rest of the app can be written against a real
  session API. Swap the three cookie functions for a provider before this is
  used by anyone outside the demo.
- **`Question.reviewed` defaults to `false`** in the schema ("only reviewed
  ones count for certification"), but `prisma/seed.ts` sets it `true` for
  authored questions. Nothing reads the flag yet — it's there for a future
  question bank.
- **`prisma generate` output is gitignored** (`lib/generated/prisma`).
  `npm install` regenerates it; if imports from `@/lib/generated/prisma/...`
  can't resolve, run `npx prisma generate`.
