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
  // Web
  js: 'javascript-fundamentals',
  javascript: 'javascript-fundamentals',
  ecmascript: 'javascript-fundamentals',
  ts: 'javascript-fundamentals',
  typescript: 'javascript-fundamentals',
  html: 'html-css-fundamentals',
  css: 'html-css-fundamentals',
  htmlcss: 'html-css-fundamentals',
  react: 'frontend-frameworks',
  reactjs: 'frontend-frameworks',
  vue: 'frontend-frameworks',
  angular: 'frontend-frameworks',
  next: 'frontend-frameworks',
  nextjs: 'frontend-frameworks',
  svelte: 'frontend-frameworks',
  tailwind: 'ui-visual-design',
  tailwindcss: 'ui-visual-design',
  node: 'backend-apis',
  nodejs: 'backend-apis',
  express: 'backend-apis',
  django: 'backend-apis',
  flask: 'backend-apis',
  rest: 'backend-apis',
  api: 'backend-apis',
  apis: 'backend-apis',
  git: 'git-version-control',
  github: 'git-version-control',
  gitlab: 'git-version-control',
  versioncontrol: 'git-version-control',
  a11y: 'web-accessibility',
  accessibility: 'web-accessibility',
  testing: 'testing-and-debugging',
  debugging: 'testing-and-debugging',
  jest: 'testing-and-debugging',
  docker: 'cloud-deployment-cicd',
  kubernetes: 'cloud-deployment-cicd',
  cicd: 'cloud-deployment-cicd',
  devops: 'cloud-deployment-cicd',

  // Data
  sql: 'sql-fundamentals',
  postgres: 'sql-fundamentals',
  postgresql: 'sql-fundamentals',
  mysql: 'sql-fundamentals',
  sqlite: 'sql-fundamentals',
  databases: 'sql-fundamentals',
  excel: 'spreadsheet-analysis',
  spreadsheets: 'spreadsheet-analysis',
  googlesheets: 'spreadsheet-analysis',
  tableau: 'data-visualization',
  powerbi: 'data-visualization',
  dataviz: 'data-visualization',
  charts: 'data-visualization',
  statistics: 'statistics-fundamentals',
  stats: 'statistics-fundamentals',
  python: 'python-for-data',
  py: 'python-for-data',
  pandas: 'python-for-data',
  numpy: 'python-for-data',
  ml: 'machine-learning-basics',
  ai: 'machine-learning-basics',
  machinelearning: 'machine-learning-basics',
  etl: 'etl-data-warehousing',
  datawarehouse: 'etl-data-warehousing',
  datacleaning: 'data-cleaning',
  dataanalysis: 'data-cleaning',
  dataanalytics: 'data-cleaning',
  erd: 'database-design',
  datamodeling: 'database-design',

  // Infrastructure & security
  aws: 'cloud-computing-fundamentals',
  azure: 'cloud-computing-fundamentals',
  gcp: 'cloud-computing-fundamentals',
  amazonwebservices: 'cloud-computing-fundamentals',
  cloud: 'cloud-computing-fundamentals',
  networking: 'network-security-basics',
  netsec: 'network-security-basics',
  security: 'network-security-basics',
  cybersecurity: 'network-security-basics',
  appsec: 'secure-coding-practices',
  owasp: 'secure-coding-practices',
  iam: 'identity-access-management',
  sso: 'identity-access-management',
  crypto: 'cryptography-basics',
  cryptography: 'cryptography-basics',
  encryption: 'cryptography-basics',
  siem: 'security-monitoring-log-analysis',
  logging: 'security-monitoring-log-analysis',
  pentesting: 'vulnerability-assessment',
  itil: 'it-service-management',
  helpdesk: 'technical-support-troubleshooting',
  support: 'technical-support-troubleshooting',
  erp: 'enterprise-systems',
  sap: 'enterprise-systems',

  // Project & communication
  pm: 'project-planning-scheduling',
  projectmanagement: 'project-planning-scheduling',
  gantt: 'project-planning-scheduling',
  agile: 'agile-scrum',
  scrum: 'agile-scrum',
  kanban: 'agile-scrum',
  jira: 'agile-scrum',
  budgeting: 'budgeting-resource-management',
  stakeholders: 'stakeholder-management',
  productmanagement: 'product-management-basics',
  writing: 'technical-writing',
  documentation: 'technical-writing',
  docs: 'technical-writing',
  presenting: 'presentation-skills',
  publicspeaking: 'presentation-skills',
  communication: 'presentation-skills',

  // Design
  ux: 'ux-design-fundamentals',
  ui: 'ui-visual-design',
  design: 'ux-design-fundamentals',
  figma: 'prototyping-wireframing',
  wireframing: 'prototyping-wireframing',
  prototyping: 'prototyping-wireframing',
  userresearch: 'user-research-methods',
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
