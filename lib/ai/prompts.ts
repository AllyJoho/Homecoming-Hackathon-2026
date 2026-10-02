// @/lib/ai/prompts.ts
// Prompt text lives here, away from the request code, so it can be edited and
// diffed on its own — prompts are the part of an AI feature that gets tuned
// most often during a hackathon.
//
// Caching note: the system prompt is a constant and is sent first, so it's the
// stable prefix. Keep per-user content (the profile, the listings) in the user
// message and this stays cacheable as the app grows.

/**
 * The tutor behind the "Explain what I missed" button under each question on a
 * quiz result, used by /api/results/[resultId]/feedback.
 *
 * One question per conversation, and the conversation continues: the student
 * reads the explanation and can ask back. So this has to do two jobs the old
 * whole-quiz prompt didn't — hold a thread without losing the question, and
 * stay inside it when a follow-up wanders off.
 *
 * Still plain prose rather than a schema. The structured-fields trick that
 * stopped the old card rendering literal `**asterisks**` can't work on a
 * conversation, so the markdown ban is back to being an instruction — and an
 * instruction not to format is one models break. Measured on Haiku: told to
 * use no marks at all, it still reached for backticks around identifiers and
 * asterisks around a stressed word, in most replies.
 *
 * So rather than forbidding the marks and rendering the leak as literal
 * punctuation, this permits exactly three and QuestionCoach renders each one.
 * Allowing what a model reaches for anyway is more reliable than banning it.
 *
 * The third, fenced code blocks, was added after watching a student's most
 * obvious follow-up — "show me an example" — come back as a fence every time
 * no matter how firmly the prompt said not to. It renders through the same
 * CodeBlock as the question's own snippet, so a worked example is highlighted
 * rather than printed as literal backticks.
 *
 * The ban still holds where it matters: headings and bullet lists are what
 * made the old card unreadable, and a tutor talking about one question has no
 * use for either.
 */
export const QUESTION_COACH_SYSTEM_PROMPT = `You are a patient tutor helping a student understand ONE question from a quiz they have just finished.

The first message gives you that question, the correct answer, and what the student answered. Every message after it is the student talking to you.

Your first reply: say what the correct answer is and why it is right, then name the specific misunderstanding their answer points to. Three or four sentences. Address them directly as "you". If they left it blank, explain the concept instead of guessing at what they were thinking.

After that, answer what they ask. Stay on this question and the concept behind it — if they ask about something else, say so in a sentence and offer what you can about this question instead. If they push back and they are right, say so plainly and correct yourself.

The first message is the record of what happened: never tell them they answered something other than what it says. If the question is genuinely ambiguous or the answer key looks wrong to you, say that rather than defending it.

Do not open with a greeting, and do not praise them for asking. Start with the substance.

Formatting: plain sentences in short paragraphs. Three marks are available, and the app renders all three:

- \`single backticks\` around code, SQL, identifiers, and literal values, inline in a sentence.
- *single asterisks* around a word you need to stress.
- A fenced block for a multi-line example — a query, a snippet, a few rows of a table. Always tag the fence with a language, and use \`text\` for anything that isn't code. The app syntax-highlights these, so put a worked example in one rather than inline.

Nothing else: no headings, no bullet or numbered lists in your prose, no markdown tables. Keep each reply under about 120 words unless they ask for more detail; a fenced example doesn't count toward that.`;

/**
 * The opening turn of a coaching conversation: everything about one question
 * the tutor needs, written out.
 *
 * This is a user message rather than part of the system prompt so the system
 * prompt stays a constant prefix across every question and every follow-up —
 * the caching shape the note at the top of this file describes.
 *
 * `correct` is passed rather than inferred because the button is offered under
 * every reviewed question, not only the missed ones. A student who guessed
 * right still has something to learn, and a tutor told they got it right
 * writes a different (and shorter) explanation than one assuming a mistake.
 */
export function buildQuestionCoachOpening(parts: {
  quizTitle: string;
  questionNumber: number;
  questionCount: number;
  correct: boolean;
  prompt: string;
  /** Numbered snippet, when the question carries one. */
  code: string | null;
  /** The choices offered, when the type has any. */
  options: string | null;
  answerKey: string;
  studentAnswer: string;
  /** The quiz author's own note on the question, when there is one. */
  authorNote?: string;
}): string {
  const sections = [
    `Quiz: ${parts.quizTitle}`,
    `Question ${parts.questionNumber} of ${parts.questionCount} — the student got this ${
      parts.correct ? 'RIGHT' : 'WRONG'
    }.`,
    `Question: ${parts.prompt}`,
  ];

  if (parts.code) sections.push(`Code shown with the question:\n${parts.code}`);
  if (parts.options) sections.push(`The choices offered:\n${parts.options}`);

  sections.push(`Correct answer: ${parts.answerKey}`);
  sections.push(`The student answered: ${parts.studentAnswer}`);

  // The author's note is the ground truth for *why*, so it goes last, closest
  // to the instruction — and it is the one part the student has already read
  // on the results screen, so the tutor is told not to just repeat it.
  if (parts.authorNote) {
    sections.push(
      `The quiz author's note on this question (the student has already read this, so build on it rather than repeating it): ${parts.authorNote}`,
    );
  }

  sections.push(
    parts.correct
      ? 'Explain why that answer is right, and what the question was testing.'
      : 'Explain what I missed.',
  );

  return sections.join('\n\n');
}

/**
 * Maps a free-text job description onto the canonical skill vocabulary, for
 * @/lib/jobs/ingest.
 *
 * This is the step that makes live listings usable at all. Everything
 * downstream — @/lib/jobs/match's weighted scoring, the "take this quiz"
 * links — keys off canonical slugs, and no job board publishes those. So a
 * real listing has to be translated into this app's vocabulary before it can
 * be matched against anyone. The weights are what let matching be arithmetic
 * rather than another model call.
 *
 * The vocabulary goes in the system prompt and the listing in the user
 * message, which keeps the long stable half first — the right shape for
 * caching if this ever runs over thousands of listings.
 */
export function buildExtractionSystemPrompt(
  vocabulary: { slug: string; name: string }[],
): string {
  const list = vocabulary.map((skill) => `- ${skill.slug}: ${skill.name}`).join('\n');

  return `You read one job listing and map it onto a fixed skill vocabulary.

The ONLY skills that exist are these. Use the slug exactly as written. Never invent a slug, and never return one that isn't on this list:

${list}

For the listing you are given, return:

- "skills": one entry per skill the listing actually asks for. Each entry has:
    - "slug": from the list above, copied exactly.
    - "required": true if the listing treats it as a must-have, false if it is preferred, a bonus, or "a plus".
    - "weight": 1-5, how central the skill is to doing this job. 5 is the role's core — a SQL analyst's SQL. 3 is genuinely used but not the point of the job. 1 is mentioned in passing. Weight is about centrality, not about whether it is required: a nice-to-have can still be a 4 if the role revolves around it.
  Only what the text actually asks for. Do not add skills that merely tend to go with the role, and do not pad the list to look thorough — a typical listing names three to six.
- "level": "internship" if it is an internship, "entry" for new grads or 0-2 years, "mid" for 2-5 years, "senior" for 5+ or a lead/principal title.
- "salaryRange": the pay range as written, e.g. "$75,000-90,000" or "$25/hr". Omit the field entirely if the listing gives no number. Never estimate one.

A listing outside this vocabulary — sales, accounting, clinical, warehouse — should come back with "skills" empty. That is a correct answer, not a failure; do not stretch to fill it. Returning most of the vocabulary for one listing is always wrong.`;
}

/** The per-listing half of the extraction call. */
export function buildExtractionUserMessage(listing: {
  title: string;
  company: string;
  location: string;
  department?: string;
  description: string;
}): string {
  return `Title: ${listing.title}
Company: ${listing.company}
Location: ${listing.location}${listing.department ? `\nDepartment: ${listing.department}` : ''}

Description:
${listing.description}`;
}

/**
 * Reads a pasted resume into the canonical skill vocabulary, for
 * @/lib/profile/resume.
 *
 * The mirror image of the job extraction above, and deliberately the same
 * shape: both sides of a match get translated into the same 46 slugs, and then
 * matching is set arithmetic rather than a third model call.
 *
 * `evidence` is the part that earns its tokens. A student who sees "SQL —
 * 'wrote reporting queries against Postgres' " believes the readout and can
 * correct it; a bare list of skills they can't trace back to anything reads as
 * a guess, and they'd have been better off ticking boxes.
 */
export function buildResumeSystemPrompt(
  vocabulary: { slug: string; name: string }[],
): string {
  const list = vocabulary.map((skill) => `- ${skill.slug}: ${skill.name}`).join('\n');

  return `You read a student's resume and identify which of a fixed set of skills it actually evidences.

The ONLY skills that exist are these. Use the slug exactly as written. Never invent a slug, and never return one that isn't on this list:

${list}

Return three things.

1. "skills": one entry per skill the resume genuinely evidences. Each entry has:
    - "slug": from the list above, copied exactly.
    - "evidence": a short quote or close paraphrase from the resume that supports it — the project, course, job, or tool that shows it. Under 15 words.
  Include a skill only when something in the document backs it. A named technology, a described project, a relevant course, a job duty. Do NOT infer a skill because it usually accompanies another one: someone who built a React app has not thereby demonstrated database design.

  A resume with nothing in this vocabulary should return an empty array. That is a correct answer. Returning most of the vocabulary is always wrong — a strong student resume evidences perhaps eight to fifteen of these.

2. "experiences": the resume's entries, structured, in the order they appear. One per job, project, degree, or activity. Each has:
    - "kind": "EDUCATION" for a degree or school, "WORK" for a job or internship, "PROJECT" for something they built, "LEADERSHIP" for a club, team, volunteering, or officer role.
    - "title": their role, or the project's name. "Data Analyst Intern", "Course Planner".
    - "organization": the employer, school, club, or course. For a personal project with no organization, use "Personal project".
    - "location": only if the resume states one. Omit otherwise.
    - "startDate" / "endDate": EXACTLY as written — "Summer 2026", "May 2026", "2025". Do not convert, normalise, or infer a format. Omit either one the resume doesn't give.
    - "current": true only if it says so ("present", "current", "expected").
    - "bullets": their bullet points for this entry, lightly cleaned of leading symbols, otherwise their words. Keep each one's substance and any numbers. An entry with no bullets gets an empty array — do not invent them.

  Copy what is there. Do not improve their writing, merge entries, or add an entry the resume doesn't contain.

3. "summary": one sentence, addressed to the student, on what the resume shows. Mention the strongest one or two areas. No flattery, no advice.`;
}
