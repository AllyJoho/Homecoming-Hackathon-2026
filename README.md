# Homecoming Hackathon

Hackathon prompt: **Improving the job hunt.**
Time limit: **8 hours**. Team: **4 people**. Goal: **creativity**.

## The Idea

A website where users take short quizzes on programming languages and software engineering topics, get scored, and earn a certificate with a proficiency level. A job search page then shows job titles along with the skills (quizzes) each one requires, so users can see how ready they are for each role.

## Stack

- Next.js
- TypeScript
- Prisma
- Postgres

Setup steps and project layout: [docs/SETUP.md](docs/SETUP.md).

## Where AI Is Used

Two places, both triggered by a button the student presses — nothing calls a
model on page load.

| Feature | Where | What it does |
| --- | --- | --- |
| **Job ranking** | "Find my matches" on `/recommendations` | Scores the shortlisted listings against the profile, with reasons and missing skills |
| **Quiz coaching** | "Explain what I missed" on a quiz result | Explains only the questions the student got wrong |

`lib/ai/tasks.ts` is the inventory: every AI call site, which model serves it,
what it costs, and what the student sees when it fails. The providers read
their model ids out of that table, so it can't drift from what actually runs.

```bash
npm run ai:report      # print every call site and the model serving it
```

At runtime each call logs one line to the dev server console:

```
[ai] quiz-coaching · anthropic/claude-haiku-4-5 · 2001ms · in 773 out 109 · $0.0013 · session $0.0567 over 2 calls
```

If a feature hits a model and no `[ai]` line appears, it bypassed
`lib/ai/provider.ts` — that's a bug, not a gap in the log.

### Switching between a local model and Claude

Everything goes through one door (`lib/ai/provider.ts`), so the backend is an
env var. In `.env`:

```bash
AI_PROVIDER=ollama      # local model — free, slower, for tuning prompts
AI_PROVIDER=anthropic   # Claude — costs money, what the demo runs on
```

Local needs `ollama serve` running and the model pulled (`ollama pull mistral`).
Both backends constrain job ranking to the same zod schema — Anthropic via
structured outputs, Ollama via JSON-Schema-constrained decoding — so the
feature works on either.

Per-task overrides beat the global setting, because the right answer differs by
task. Job ranking takes ~2 minutes locally against ~16s on Opus, so the usual
split is:

```bash
AI_PROVIDER=ollama
AI_PROVIDER_JOB_RANKING=anthropic
```

**One caveat worth knowing before you tune prompts locally:** `mistral` ignores
parts of the ranking prompt that Claude follows. It pads the list instead of
omitting poor matches, and inflates scores for unverified skills. Prompt
changes that fix those are fixing a local-model problem, so re-check any
prompt edit against `AI_PROVIDER=anthropic` before trusting it.

## How Quizzes Work

- Quiz banks contain **5–15 questions**, depending on the skill; the two original authored banks have 15 and the full skill catalog now has a focused bank for every skill.
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
| Quiz questions | The skill quiz |
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
