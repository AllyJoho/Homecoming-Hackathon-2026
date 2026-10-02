// @/types/experience.ts
// What a student has done, as the app reasons about it. Mirrors the Prisma
// `Experience` model but stays independent of it, for the same reason
// @/types/profile does: the shapes the UI and the AI prompts see shouldn't
// shift because a column was renamed.

/** The four sections a student resume actually has. */
export type ExperienceKind = 'WORK' | 'PROJECT' | 'EDUCATION' | 'LEADERSHIP';

/** Typed in by hand, or parsed out of a pasted resume. */
export type ExperienceSource = 'MANUAL' | 'RESUME';

export interface Experience {
  id: string;
  kind: ExperienceKind;
  title: string;
  organization: string;
  location?: string;
  /** Free text — "Summer 2026", "May 2026". Never parsed into a date. */
  startDate?: string;
  endDate?: string;
  current: boolean;
  /** One resume bullet each, in print order. */
  bullets: string[];
  sortOrder: number;
  source: ExperienceSource;
}

/** What the form submits. No id — the route decides create vs update. */
export interface ExperienceInput {
  kind: ExperienceKind;
  title: string;
  organization: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current: boolean;
  bullets: string[];
}

/** Section headings, in the order a resume prints them. */
export const EXPERIENCE_KINDS: { kind: ExperienceKind; label: string; hint: string }[] = [
  { kind: 'EDUCATION', label: 'Education', hint: 'Degree, school, graduation' },
  { kind: 'WORK', label: 'Experience', hint: 'Jobs and internships' },
  { kind: 'PROJECT', label: 'Projects', hint: 'What you built, course or personal' },
  { kind: 'LEADERSHIP', label: 'Leadership & Activities', hint: 'Clubs, volunteering, teams' },
];

export const EXPERIENCE_KIND_LABEL: Record<ExperienceKind, string> = Object.fromEntries(
  EXPERIENCE_KINDS.map(({ kind, label }) => [kind, label]),
) as Record<ExperienceKind, string>;

/** "Summer 2026 — present", or whatever subset the student filled in. */
export function formatDateRange(experience: Experience): string {
  const { startDate, endDate, current } = experience;
  const end = current ? 'present' : endDate;

  if (startDate && end) return `${startDate} — ${end}`;
  return startDate ?? end ?? '';
}
