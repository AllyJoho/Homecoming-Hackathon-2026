// @/lib/profile/resume.ts
// Reads a pasted resume into canonical skill slugs.
//
// This is the AI step that deterministic code genuinely cannot do: a resume is
// unstructured prose about projects, coursework and jobs, and the only way to
// learn that "built a reporting pipeline in Postgres" means `sql-fundamentals`
// is to read it.
//
// It's the same translation the job ingest performs, pointed the other way —
// both sides of a match land in the same 46-slug vocabulary, which is what
// lets @/lib/jobs/match be arithmetic instead of a third model call.

import { z } from 'zod';

import type { ExperienceInput } from '@/types/experience';
import { MAX_RESUME_CHARS, MIN_RESUME_CHARS } from '@/lib/profile/resumeLimits';
import { CANONICAL_SKILLS, skillBySlug } from '@/lib/profile/skills';
import { generateObject } from '@/lib/ai/provider';
import { buildResumeSystemPrompt } from '@/lib/ai/prompts';

const ResumeSchema = z.object({
  skills: z.array(
    z.object({
      slug: z.string().describe('A slug from the vocabulary, copied exactly'),
      evidence: z.string().describe('Short quote from the resume supporting it'),
    }),
  ),
  experiences: z.array(
    z.object({
      kind: z.enum(['WORK', 'PROJECT', 'EDUCATION', 'LEADERSHIP']),
      title: z.string(),
      organization: z.string(),
      location: z.string().optional(),
      startDate: z.string().optional().describe('Exactly as written, e.g. "Summer 2026"'),
      endDate: z.string().optional(),
      current: z.boolean(),
      bullets: z.array(z.string()),
    }),
  ),
  summary: z.string(),
});

/** One detected skill, with the line that justified it. */
export interface ResumeSkill {
  slug: string;
  name: string;
  evidence: string;
}

export interface ResumeReading {
  skills: ResumeSkill[];
  /** The resume's own entries, structured, ready to edit or render. */
  experiences: ExperienceInput[];
  summary: string;
}

/**
 * Same guard as job extraction, same reason: a weak model asked to choose from
 * 46 options sometimes returns most of them, and a profile claiming forty
 * skills would match every listing in the database.
 */
const MAX_RESUME_SKILLS = 20;

/** A student resume does not contain fifty jobs. Past this it's hallucinating. */
const MAX_RESUME_EXPERIENCES = 25;

export class ResumeError extends Error {}

export async function readResume(text: string): Promise<ResumeReading> {
  const trimmed = text.trim();

  if (trimmed.length < MIN_RESUME_CHARS) {
    throw new ResumeError(
      `That's only ${trimmed.length} characters — paste the whole resume (at least ${MIN_RESUME_CHARS}).`,
    );
  }
  if (trimmed.length > MAX_RESUME_CHARS) {
    throw new ResumeError(
      `That's ${trimmed.length.toLocaleString()} characters, past the ${MAX_RESUME_CHARS.toLocaleString()} limit. Paste just the resume.`,
    );
  }

  const reading = await generateObject({
    task: 'resume-extraction',
    system: buildResumeSystemPrompt(CANONICAL_SKILLS),
    prompt: `Resume:\n\n${trimmed}`,
    schema: ResumeSchema,
  });

  if (!reading) {
    throw new ResumeError('Could not read that resume. Try again.');
  }

  // Real slugs only, once each — an invented one would render as a dead chip.
  const bySlug = new Map<string, ResumeSkill>();
  for (const entry of reading.skills) {
    const slug = entry.slug.trim().toLowerCase();
    const skill = skillBySlug(slug);
    if (!skill || bySlug.has(slug)) continue;

    bySlug.set(slug, {
      slug,
      name: skill.name,
      evidence: entry.evidence.trim(),
    });
  }

  const skills = [...bySlug.values()];
  if (skills.length > MAX_RESUME_SKILLS) {
    throw new ResumeError(
      `The model claimed ${skills.length} skills from one resume, which it can't support. Nothing was saved — try again.`,
    );
  }

  const experiences = cleanExperiences(reading.experiences);
  if (experiences.length > MAX_RESUME_EXPERIENCES) {
    throw new ResumeError(
      `The model found ${experiences.length} separate entries in one resume, which isn't plausible. Nothing was saved — try again.`,
    );
  }

  return { skills, experiences, summary: reading.summary.trim() };
}

/**
 * Drop entries with nothing identifying them, and tidy bullets.
 *
 * An entry needs a title or an organization to be worth showing — a row that
 * says only "Summer 2026" is noise a student then has to delete. Bullets get
 * their leading list markers stripped because the UI and the rendered resume
 * add their own, and a doubled bullet looks like a bug.
 */
function cleanExperiences(
  raw: ResumeReadingRaw['experiences'],
): ExperienceInput[] {
  return raw
    .map((entry) => ({
      kind: entry.kind,
      title: entry.title.trim(),
      organization: entry.organization.trim(),
      location: entry.location?.trim() || undefined,
      startDate: entry.startDate?.trim() || undefined,
      endDate: entry.endDate?.trim() || undefined,
      current: entry.current,
      bullets: entry.bullets
        .map((bullet) => bullet.replace(/^[\s•▪◦*-]+/, '').trim())
        .filter(Boolean),
    }))
    .filter((entry) => entry.title.length > 0 || entry.organization.length > 0);
}

type ResumeReadingRaw = z.infer<typeof ResumeSchema>;
