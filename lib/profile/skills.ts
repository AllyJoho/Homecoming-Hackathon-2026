// @/lib/profile/skills.ts
// The canonical skill vocabulary, and the normalizer that funnels free text
// into it. Everything else — quizzes (`skillSlug`), job listings
// (`requiredSkills`), the AI prompt — refers to skills by these slugs, so
// "JS" typed on the home screen and "JavaScript" in a listing are one skill.
//
// The list itself lives in data/skills.json and is the seed for the `Skill`
// table (see prisma/seed.ts).

import type { Skill } from '@/types/profile';
import skillsJson from '@/data/skills.json';

// The vocabulary itself is data, so it lives in data/skills.json — the same
// file prisma/seed.ts loads into the Skill table. Editing that JSON changes
// both the normalizer and the seed, so the two can't drift.
export const CANONICAL_SKILLS: Skill[] = skillsJson;

const BY_SLUG = new Map(CANONICAL_SKILLS.map((s) => [s.slug, s]));

/**
 * Spellings that should collapse onto a canonical slug. Keys are already
 * lowercased and punctuation-stripped by `key()` below — add new aliases in
 * that same form.
 */
const ALIASES: Record<string, string> = {
  js: 'javascript',
  ecmascript: 'javascript',
  node: 'node',
  nodejs: 'node',
  ts: 'typescript',
  py: 'python',
  'c++': 'cpp',
  cplusplus: 'cpp',
  'c#': 'csharp',
  csharp: 'csharp',
  dotnet: 'csharp',
  postgres: 'sql',
  postgresql: 'sql',
  mysql: 'sql',
  sqlite: 'sql',
  databases: 'sql',
  html: 'html-css',
  css: 'html-css',
  htmlcss: 'html-css',
  reactjs: 'react',
  next: 'nextjs',
  nextjs: 'nextjs',
  tailwindcss: 'tailwind',
  github: 'git',
  amazonwebservices: 'aws',
  ml: 'machine-learning',
  ai: 'machine-learning',
  pandas: 'data-analysis',
  dataanalytics: 'data-analysis',
  ux: 'ui-ux',
  ui: 'ui-ux',
  design: 'ui-ux',
  pm: 'project-management',
  agile: 'project-management',
  scrum: 'project-management',
  writing: 'technical-writing',
};

/** Lowercase, strip spaces/dots/dashes — "Next.js" and "next js" both → "nextjs". */
function key(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s._-]/g, '');
}

/**
 * Resolve arbitrary user input to a canonical skill, or null if we don't know
 * it. Returning null (rather than inventing a skill) is deliberate: the UI can
 * then say "we don't track that yet" instead of polluting the vocabulary the
 * recommender reasons over.
 */
export function normalizeSkill(raw: string): Skill | null {
  const k = key(raw);
  if (!k) return null;

  // Exact slug, e.g. "javascript" or "html-css".
  const bySlug = BY_SLUG.get(raw.trim().toLowerCase());
  if (bySlug) return bySlug;

  // Canonical slug with punctuation stripped, e.g. "htmlcss" → "html-css".
  const stripped = CANONICAL_SKILLS.find((s) => key(s.slug) === k || key(s.name) === k);
  if (stripped) return stripped;

  const aliased = ALIASES[k];
  if (aliased) return BY_SLUG.get(aliased) ?? null;

  return null;
}

/** Look up a slug we already trust (e.g. one stored in the DB). */
export function skillBySlug(slug: string): Skill | undefined {
  return BY_SLUG.get(slug);
}
