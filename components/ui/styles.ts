// @/components/ui/styles.ts
// Shared class strings for the UI primitives. Ported from the ECE purchasing
// app's components/general/templateStyles.ts — same idea, same structure:
// anything reused in 2+ component files lives here, one-offs stay inline.
//
// Two deliberate differences from that app:
//   • No BYU brand colors. The accent is `indigo`, the neutral `zinc`.
//   • Every token carries its dark: pair, because this app renders in both
//     schemes. Purchasing is light-only, so its strings needed no dark half.

// ── Controls ─────────────────────────────────────────────────────────────────

export const LABEL_CLASS = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1';

// `min-w-0` lets an input sit in a flex or grid track without forcing the track
// wider than its slot. Composed by INPUT_CLASS and by custom click surfaces.
export const INPUT_SURFACE =
  'w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 ' +
  'dark:border-zinc-700 dark:bg-surface ' +
  'focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500';

// Appended on a field-local validation error. The Tailwind `!` suffix is what
// overrides INPUT_SURFACE's zinc-300 default.
export const FIELD_ERROR_OVERRIDE =
  ' border-red-500! hover:border-red-500! focus:border-red-500! focus:ring-red-500!';

export const INPUT_CLASS = INPUT_SURFACE + ' text-sm text-zinc-900 dark:text-zinc-50';

export const FIELD_ERROR_CLASS = 'mt-1 text-xs text-red-600 dark:text-red-400';
export const FIELD_HELPER_CLASS = 'mt-1 text-xs text-zinc-500 dark:text-zinc-400';

export const DISABLED_INPUT_CLASS =
  ' bg-zinc-50 text-zinc-500 cursor-not-allowed dark:bg-surface-raised dark:text-zinc-500';

export const DISABLED_CONTROL = 'disabled:cursor-not-allowed disabled:opacity-50';

// Keyboard focus only, for bool controls; input surfaces ring always-on.
export const FOCUS_VISIBLE_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40';

// ── Buttons ──────────────────────────────────────────────────────────────────
// `variant` gives fill/border/hover, `size` the resting chrome.

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-700 border border-transparent ' +
    'dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:text-white',
  secondary:
    'bg-transparent text-zinc-900 border border-zinc-300 hover:bg-zinc-100 ' +
    'dark:text-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800',
  ghost:
    'bg-transparent text-zinc-700 border border-transparent hover:bg-zinc-100 ' +
    'dark:text-zinc-300 dark:hover:bg-zinc-800',
  danger:
    'bg-red-600 text-white hover:bg-red-700 border border-transparent ' +
    'dark:bg-red-700 dark:hover:bg-red-600',
  subtle:
    'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-transparent ' +
    'dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900',
};

// A sunken, filled look for toggle-style buttons, one per variant.
export const BUTTON_PRESSED_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-800 text-white border border-transparent shadow-inner',
  secondary:
    'bg-zinc-200 text-zinc-900 border border-zinc-400 shadow-inner ' +
    'dark:bg-zinc-700 dark:text-zinc-50 dark:border-zinc-600',
  ghost: 'bg-zinc-200 text-zinc-800 border border-transparent shadow-inner dark:bg-zinc-700 dark:text-zinc-100',
  danger: 'bg-red-800 text-white border border-transparent shadow-inner',
  subtle:
    'bg-indigo-100 text-indigo-800 border border-transparent shadow-inner ' +
    'dark:bg-indigo-900 dark:text-indigo-200',
};

// Rounded-full rather than purchasing's rounded-lg: this app's existing buttons
// are pills, and changing that would restyle every screen at once.
export const BUTTON_SIZE_CLASSES: Record<ButtonSize, string> = {
  // `xs` is the compact chip size, for a button sitting inside a dense card.
  xs: 'h-6 px-2 text-xs rounded-full gap-1',
  sm: 'h-8 px-3 text-sm rounded-full gap-1.5',
  md: 'h-10 px-4 text-sm rounded-full gap-2',
  lg: 'h-12 px-6 text-base rounded-full gap-2.5',
};

export const BUTTON_ICON_SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

// Bare icon: no fill or border, just a colour shift on hover. Its own variants.
export type IconButtonVariant = 'default' | 'danger' | 'ghost';

export const ICON_BUTTON_VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  default:
    'text-zinc-500 hover:text-zinc-900 cursor-pointer dark:text-zinc-400 dark:hover:text-zinc-50',
  danger: 'text-red-500 hover:text-red-700 cursor-pointer dark:text-red-400 dark:hover:text-red-300',
  ghost:
    'text-zinc-400 hover:text-zinc-600 cursor-pointer dark:text-zinc-500 dark:hover:text-zinc-300',
};

// ── Surfaces ─────────────────────────────────────────────────────────────────

export const CARD_SURFACE =
  'rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-surface-border dark:bg-surface';

// A one-step shadow grow, appended to a card surface. Static panels skip it.
export const CARD_HOVER = 'transition-shadow hover:shadow-md';

// Stronger hover for clickable cards; pair with `cursor-pointer`.
export const CARD_HOVER_LIFT =
  'transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg';

// ── Page shell ───────────────────────────────────────────────────────────────
// Width presets for the centred content column, so a wide page still shares the
// standard margins.

const PAGE_BODY_WIDTHS = {
  default: 'max-w-4xl',
  wide: 'max-w-6xl',
  full: 'max-w-none',
} as const;
export type PageBodyWidth = keyof typeof PAGE_BODY_WIDTHS;

export const pageBody = (width: PageBodyWidth = 'default') =>
  `mx-auto w-full px-6 py-10 ${PAGE_BODY_WIDTHS[width]}`;

export const PAGE_BODY = pageBody();

export const SECTION_TITLE = 'text-2xl font-semibold text-zinc-900 dark:text-zinc-50';
export const SECTION_DESCRIPTION = 'text-sm text-zinc-600 dark:text-zinc-400 mt-1';

// A quiet uppercase label for a group inside a panel, where a second real
// heading would compete with the panel's own title.
export const GROUP_HEADING =
  'text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400';

// ── Tags ─────────────────────────────────────────────────────────────────────
// `variant` picks the colour, Tag's `solid` prop the treatment: solid fills with
// white text and stands alone; soft is tinted and quieter, better in lists.

export type TagVariant =
  | 'accent'
  | 'neutral'
  | 'success'
  | 'error'
  | 'warning'
  | 'info';
export type TagSize = 'sm' | 'md' | 'lg';

type TagTreatment = { solid: string; soft: string };

export const TAG_VARIANT_CLASSES: Record<TagVariant, TagTreatment> = {
  accent: {
    solid: 'bg-indigo-600 text-white dark:bg-indigo-500',
    soft: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:ring-indigo-900',
  },
  neutral: {
    solid: 'bg-zinc-600 text-white dark:bg-zinc-500',
    soft: 'bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700',
  },
  success: {
    solid: 'bg-emerald-600 text-white dark:bg-emerald-500',
    soft: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900',
  },
  error: {
    solid: 'bg-red-600 text-white dark:bg-red-500',
    soft: 'bg-red-50 text-red-800 ring-1 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-900',
  },
  warning: {
    solid: 'bg-amber-500 text-white dark:bg-amber-500',
    soft: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900',
  },
  info: {
    solid: 'bg-sky-600 text-white dark:bg-sky-500',
    soft: 'bg-sky-50 text-sky-800 ring-1 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-900',
  },
};

export const TAG_SIZE_CLASSES: Record<TagSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-4 py-1.5 text-sm',
};

// Hover shift for the × dismiss, matched to each fill.
export const TAG_DISMISS_HOVER_CLASSES: Record<TagVariant, TagTreatment> = {
  accent: { solid: 'hover:bg-indigo-700', soft: 'hover:bg-indigo-100 dark:hover:bg-indigo-900' },
  neutral: { solid: 'hover:bg-zinc-700', soft: 'hover:bg-zinc-200 dark:hover:bg-zinc-700' },
  success: { solid: 'hover:bg-emerald-700', soft: 'hover:bg-emerald-100 dark:hover:bg-emerald-900' },
  error: { solid: 'hover:bg-red-700', soft: 'hover:bg-red-100 dark:hover:bg-red-900' },
  warning: { solid: 'hover:bg-amber-600', soft: 'hover:bg-amber-100 dark:hover:bg-amber-900' },
  info: { solid: 'hover:bg-sky-700', soft: 'hover:bg-sky-100 dark:hover:bg-sky-900' },
};

// ── Count badge ──────────────────────────────────────────────────────────────
// Sits on a surface with a ring, so it needs its own brighter palette.

export type CountBadgeVariant = 'accent' | 'danger' | 'success' | 'warning' | 'neutral';
export type CountBadgeSize = 'sm' | 'md' | 'lg';

export const COUNT_BADGE_VARIANT_CLASSES: Record<CountBadgeVariant, string> = {
  accent: 'bg-indigo-600 text-white dark:bg-indigo-500',
  danger: 'bg-red-600 text-white dark:bg-red-500',
  success: 'bg-emerald-600 text-white dark:bg-emerald-500',
  warning: 'bg-amber-500 text-white',
  neutral: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200',
};

export const COUNT_BADGE_SIZE_CLASSES: Record<CountBadgeSize, string> = {
  sm: 'h-4 min-w-4 text-[9px] pb-px',
  md: 'h-5 min-w-5 text-[10px] pb-px',
  lg: 'h-6 min-w-6 text-xs',
};
