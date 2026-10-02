// @/components/ui/categoryColors.ts
// One hue per skill category / career field, so colour carries information
// rather than decoration: a Cybersecurity card looks the same on the skills
// board, in a career breakdown, and in a job match.
//
// The seven keys are the `category` values in data/skills.json and the `field`
// values in data/careers.json — the two taxonomies are the same seven names, so
// one map serves both.
//
// Class strings are written out in full because Tailwind scans source text: a
// composed `text-${hue}-700` would never reach the stylesheet.
//
// `stripe` carries `!` for the same reason SkillCard's accents do — it has to
// beat the `hover:border-zinc-300` border-color SHORTHAND, which Tailwind emits
// after every border-left-color rule.

export interface CategoryColor {
  /** Left edge accent for a card. */
  stripe: string;
  /** Soft tinted pill, for the category label itself. */
  tag: string;
  /** Just the text, where a pill would be too heavy. */
  text: string;
  /** A small filled dot, for legends and dense rows. */
  dot: string;
}

const NEUTRAL: CategoryColor = {
  stripe: 'border-l-zinc-200! dark:border-l-zinc-700!',
  tag: 'bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700',
  text: 'text-zinc-500 dark:text-zinc-400',
  dot: 'bg-zinc-400 dark:bg-zinc-500',
};

// Hues are spread around the wheel so two categories are never confusable at a
// glance. Indigo is deliberately absent: it's the app's own accent (buttons,
// links, the logo), and reusing it here would make one category look like a
// selected state.
export const CATEGORY_COLORS: Record<string, CategoryColor> = {
  'Web Development': {
    stripe: 'border-l-sky-500! dark:border-l-sky-400!',
    tag: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-900',
    text: 'text-sky-700 dark:text-sky-400',
    dot: 'bg-sky-500 dark:bg-sky-400',
  },
  'Data & Analytics': {
    stripe: 'border-l-violet-500! dark:border-l-violet-400!',
    tag: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-900',
    text: 'text-violet-700 dark:text-violet-400',
    dot: 'bg-violet-500 dark:bg-violet-400',
  },
  Cybersecurity: {
    // Rose rather than red: red is the error colour everywhere else in the UI,
    // and a whole category permanently flagged red reads as broken.
    stripe: 'border-l-rose-500! dark:border-l-rose-400!',
    tag: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-900',
    text: 'text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-500 dark:bg-rose-400',
  },
  'Information Systems': {
    stripe: 'border-l-amber-500! dark:border-l-amber-400!',
    tag: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
  'Project Management': {
    stripe: 'border-l-teal-500! dark:border-l-teal-400!',
    tag: 'bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:ring-teal-900',
    text: 'text-teal-700 dark:text-teal-400',
    dot: 'bg-teal-500 dark:bg-teal-400',
  },
  Communication: {
    stripe: 'border-l-emerald-500! dark:border-l-emerald-400!',
    tag: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
  },
  Design: {
    stripe: 'border-l-fuchsia-500! dark:border-l-fuchsia-400!',
    tag: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200 dark:bg-fuchsia-950 dark:text-fuchsia-300 dark:ring-fuchsia-900',
    text: 'text-fuchsia-700 dark:text-fuchsia-400',
    dot: 'bg-fuchsia-500 dark:bg-fuchsia-400',
  },
};

/**
 * The colours for a category or field name. A name that isn't in the map —
 * a new category added to data/skills.json before this file catches up —
 * falls back to neutral rather than throwing or rendering an empty class.
 */
export function categoryColor(name: string | null | undefined): CategoryColor {
  return (name && CATEGORY_COLORS[name]) || NEUTRAL;
}

/** Every category that has a colour, for a legend. */
export const CATEGORY_NAMES = Object.keys(CATEGORY_COLORS);
