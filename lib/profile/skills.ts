// @/lib/profile/skills.ts
// The canonical skill vocabulary, and the normalizer that funnels free text
// into it. Everything else — quizzes (`skillSlug`), job listings
// (`requiredSkills`), the AI prompt — refers to skills by these slugs, so
// "JS" typed on the home screen and "JavaScript" in a listing are one skill.
//
// This list is the seed for the `Skill` table (see prisma/seed.ts).

import type { Skill } from '@/types/profile';

export const CANONICAL_SKILLS: Skill[] = [
  { slug: 'javascript', name: 'JavaScript', category: 'language' },
  { slug: 'typescript', name: 'TypeScript', category: 'language' },
  { slug: 'python', name: 'Python', category: 'language' },
  { slug: 'java', name: 'Java', category: 'language' },
  { slug: 'cpp', name: 'C++', category: 'language' },
  { slug: 'csharp', name: 'C#', category: 'language' },
  { slug: 'sql', name: 'SQL', category: 'language' },
  { slug: 'html-css', name: 'HTML & CSS', category: 'language' },
  { slug: 'react', name: 'React', category: 'framework' },
  { slug: 'nextjs', name: 'Next.js', category: 'framework' },
  { slug: 'node', name: 'Node.js', category: 'framework' },
  { slug: 'django', name: 'Django', category: 'framework' },
  { slug: 'tailwind', name: 'Tailwind CSS', category: 'framework' },
  { slug: 'git', name: 'Git', category: 'tool' },
  { slug: 'docker', name: 'Docker', category: 'tool' },
  { slug: 'aws', name: 'AWS', category: 'tool' },
  { slug: 'figma', name: 'Figma', category: 'tool' },
  { slug: 'excel', name: 'Excel', category: 'tool' },
  { slug: 'data-analysis', name: 'Data Analysis', category: 'domain' },
  { slug: 'machine-learning', name: 'Machine Learning', category: 'domain' },
  { slug: 'ui-ux', name: 'UI/UX Design', category: 'domain' },
  { slug: 'project-management', name: 'Project Management', category: 'domain' },
  { slug: 'technical-writing', name: 'Technical Writing', category: 'domain' },
  { slug: 'communication', name: 'Communication', category: 'soft' },
];

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
