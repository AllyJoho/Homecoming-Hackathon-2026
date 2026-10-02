# SkillStack

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
