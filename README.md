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

## Quiz Formats

Workplace tech assessments test the work itself (reading unfamiliar code, finding the bug, reviewing a change), not trivia. Research on code-reading questions such as Parsons problems shows they track code-writing ability and can still be graded automatically. So our quizzes lean on **reading real-looking code** and don't run user code.

### Formats

| Format | How it works | Status |
| --- | --- | --- |
| Multiple choice / multi-select / true-false / short answer | The original four types | ✅ Built |
| **Code snippet on any question** | Optional `code: { language, source }` on any question; rendered highlighted with line numbers. This turns multiple choice into "predict the output" | ✅ Built (Phase A) |
| **Find the bug** (`find_the_bug`) | Show a snippet; the user clicks the buggy line(s). Graded on the server as an exact set of line numbers | ✅ Built |
| **Reorder the lines** (`order_lines`, a "Parsons problem") | Lines shown shuffled; the user moves them up/down into order. Graded by exact order (identical lines like two `}` are interchangeable) | ✅ Built |
| Multi-file bug hunt | 2–3 file tabs (e.g. `api/route.ts` + `lib/price.ts`) where the bug spans files | Stretch |
| PR review | Show a diff; flag the problem lines. Same grading as find-the-bug | Stretch |

Out of scope for the hackathon: running user code in a sandbox, free-form code writing, and AI-graded open answers.

### Mix for one 15-question quiz

| Format | Count |
| --- | --- |
| Concept multiple choice / true-false | 4 |
| Predict the output (code + multiple choice) | 4 |
| Find the bug | 3 |
| Multi-select ("which of these would fix it?") | 2 |
| Reorder the lines | 1–2 |

Difficulty split: about 5 `BEGINNER`, 6 `INTERMEDIATE`, 4 `ADVANCED`, so reaching Advanced means getting the advanced questions right.

### Topics

- **Complete (15 questions, full mix):** JavaScript, SQL. Use these as the reference when writing others.
- **Starters (5 questions each):** the other 44 files in `data/quizzes/`. Valid as-is; they get expanded to 15 using the mix above.
- **MVP additions:** Git and collaboration, Python, HTTP and REST APIs
- **Optional showcase:** Debugging and Code Review, a mixed-language quiz made entirely of find-the-bug and review questions
- **Later, non-programming:** spreadsheets (find the broken formula), data literacy, technical writing

### Question-writing checklist

- **One idea per question**, so a wrong answer tells you what's missing.
- **Put the problem in the question itself.** Answer choices should be short.
- **Use work scenarios.** "A teammate's PR does X. What happens?" beats "What is X?"
- **Build wrong answers from real mistakes**: off-by-one, `==` vs `===`, a missing `await`, `WHERE` vs `HAVING`, `= NULL`.
- **3–4 options, no filler.** No "all/none of the above"; avoid words like "always" or "never" that give the answer away.
- **Avoid negatives** ("Which is NOT…"), or bold the NOT.
- **Snippets of 15 lines or fewer** with realistic names (`user`, `cartTotal`), not `foo`/`bar`.
- **Always write an `explanation`.** It's shown on the results screen, where the learning happens.
- **Tag `difficulty`** on every question.
- **Have a teammate take it cold** before it ships.

### Authoring a code question

Any question type can carry a snippet. `language` is a Prism id (`javascript`, `typescript`, `sql`, `python`, `json`, `yaml`, `go`, …).

```json
{
  "id": "sql-8",
  "type": "multiple_choice",
  "difficulty": "INTERMEDIATE",
  "prompt": "orders has 5 rows, and 2 of them have shipped_at set to NULL. What does this query return?",
  "code": {
    "language": "sql",
    "source": "SELECT COUNT(*)\nFROM orders\nWHERE shipped_at = NULL;\n"
  },
  "options": [{ "id": "a", "text": "2" }, { "id": "b", "text": "0" }],
  "correctOptionId": "b",
  "explanation": "NULL isn't equal to anything, so no rows match. Use IS NULL."
}
```

Find the bug: `code` is required, and `bugLines` lists the 1-based line number(s) of the bug.

```json
{
  "id": "js-15",
  "type": "find_the_bug",
  "difficulty": "ADVANCED",
  "prompt": "loadUserName always returns undefined. Click the buggy line.",
  "code": {
    "language": "javascript",
    "source": "async function loadUserName(id) {\n  const res = await fetch(`/api/users/${id}`);\n  const user = res.json();\n  return user.name;\n}\n"
  },
  "bugLines": [3],
  "explanation": "res.json() returns a Promise. Fix: await res.json()."
}
```

Reorder the lines: write `lines` in the **correct** order. The app shuffles them for the student. Keep indentation inside `text`.

```json
{
  "id": "js-6",
  "type": "order_lines",
  "difficulty": "BEGINNER",
  "prompt": "Put the lines in order so activeEmails returns the emails of active users only.",
  "lines": [
    { "id": "l1", "text": "function activeEmails(users) {" },
    { "id": "l2", "text": "  return users" },
    { "id": "l3", "text": "    .filter((u) => u.active)" },
    { "id": "l4", "text": "    .map((u) => u.email);" },
    { "id": "l5", "text": "}" }
  ],
  "explanation": "filter has to come before map."
}
```

Avoid reorder questions with more than one valid order (e.g. two independent statements that could go either way): only the authored order is graded correct.

Then run `npm run db:seed`. The seed rejects a `find_the_bug` whose `bugLines` fall outside the snippet, or an `order_lines` with fewer than 2 lines, and names the file and question.

### Adding a new question type

1. `types/quiz.ts`: add the question variant and its `Answer` variant.
2. `lib/quiz/publicQuiz.ts`: add the new answer-key field to `ANSWER_KEYS` so it never reaches the browser.
3. `lib/quiz/grading.ts`: add a grader.
4. `components/quiz/questions/`: add the component and register it in `index.ts`.
5. `prisma/schema.prisma`: add the `QuestionType` enum value and any answer-key column, then `npm run db:migrate`.
6. `prisma/seed.ts` and `prisma/queries.ts` (`toQuestion`): map the new type and column.

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
