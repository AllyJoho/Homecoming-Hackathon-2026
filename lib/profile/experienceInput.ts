// @/lib/profile/experienceInput.ts
// One validator for the experience form, shared by the create and update
// routes so "what counts as a valid entry" is defined once.
//
// Deliberately forgiving about dates: they're free text, because students
// write "Summer 2026". The only hard requirement is that an entry identifies
// itself — a row with no title and no organization is unreadable on a resume.

import { z } from 'zod';

import type { ExperienceInput } from '@/types/experience';

const blankToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const ExperienceInputSchema = z
  .object({
    kind: z.enum(['WORK', 'PROJECT', 'EDUCATION', 'LEADERSHIP']),
    title: z.string().trim().max(200),
    organization: z.string().trim().max(200),
    location: z.preprocess(blankToUndefined, z.string().trim().max(120).optional()),
    startDate: z.preprocess(blankToUndefined, z.string().trim().max(60).optional()),
    endDate: z.preprocess(blankToUndefined, z.string().trim().max(60).optional()),
    current: z.boolean().default(false),
    // Empty bullets are dropped rather than rejected — a half-filled row is a
    // normal state for a form someone is still typing in.
    bullets: z
      .array(z.string().max(600))
      .max(12)
      .default([])
      .transform((bullets) => bullets.map((b) => b.trim()).filter(Boolean)),
  })
  .refine((entry) => entry.title.length > 0 || entry.organization.length > 0, {
    message: 'Give the entry a title or an organization.',
    path: ['title'],
  });

/** Parse an unknown body, returning either the entry or a message to show. */
export function parseExperienceInput(
  body: unknown,
): { ok: true; input: ExperienceInput } | { ok: false; error: string } {
  const result = ExperienceInputSchema.safeParse(body);
  if (result.success) return { ok: true, input: result.data };

  return {
    ok: false,
    error: result.error.issues[0]?.message ?? 'That entry is not valid.',
  };
}
