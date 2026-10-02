// @/lib/profile/rewordGuard.ts
// Checks a reworded resume bullet against the original and refuses the ones
// that changed the facts.
//
// This exists because "make it sound more professional without changing
// anything" is not a promise a prompt can keep. Asked to polish "Wrote SQL
// reports against a 40-table Postgres warehouse", a model will cheerfully
// return "Architected enterprise-scale data solutions" — more professional,
// and the 40 is gone. Telling the model not to do that helps; it does not
// settle it.
//
// So the prompt asks and this verifies. The split matters: fabrication is
// rejected outright, because a student accepting a bullet on a resume they
// will hand to an employer has to be able to trust that the numbers in it are
// theirs. Style drift (padding, a dropped figure) is only flagged, because the
// student can see it in the diff and might genuinely prefer the rewrite.
//
// Numbers are the thing worth checking mechanically. They're the part of a
// bullet an employer asks about in an interview, they're exactly what a
// confident model invents, and unlike tone they are checkable without
// judgment.

/** Longest a rewrite can get before it reads as padding rather than polish. */
const PADDING_RATIO = 1.6;

/** Below this, a ratio means nothing — "Led a team" doubling is 10 chars. */
const PADDING_MIN_GROWTH = 40;

/**
 * Number words that carry a figure, mapped to the digits they mean.
 *
 * Here so that "a team of 3" → "a team of three" is understood as the same
 * fact rather than a dropped number, and — the case that matters — so that
 * "led a team" → "led a team of three" is caught as an invented one.
 */
const NUMBER_WORDS: Record<string, string> = {
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  eleven: '11',
  twelve: '12',
  dozen: '12',
  twenty: '20',
  thirty: '30',
  forty: '40',
  fifty: '50',
  hundred: '100',
  thousand: '1000',
  million: '1000000',
};

/**
 * A figure and, when present, the percent sign that changes what it means.
 *
 * `$` and thousands separators are matched so they can be normalised away —
 * "$40,000" and "40000" are the same claim. "percent" and "pct" fold into "%"
 * for the same reason: spelling it out isn't a change to the number.
 */
const FIGURE =
  /(?:\$\s*)?(\d+(?:,\d{3})*(?:\.\d+)?|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen|twenty|thirty|forty|fifty|hundred|thousand|million)\b)\s*(%|percent|pct\b)?/gi;

/**
 * Every figure in a string, normalised so two spellings of one number compare
 * equal. Returns a set: a number the original already contains may appear
 * again in the rewrite without that being a fabrication.
 */
export function extractFigures(text: string): Set<string> {
  const figures = new Set<string>();

  for (const match of text.matchAll(FIGURE)) {
    const raw = match[1].toLowerCase();
    const digits = NUMBER_WORDS[raw] ?? raw.replace(/,/g, '');
    // A percent sign is part of the claim, so it stays part of the token:
    // "cut costs 20%" and "cut costs by 20" are not the same sentence.
    figures.add(match[2] ? `${digits}%` : digits);
  }

  return figures;
}

/**
 * Verbs that say the student took part in something rather than owning it.
 *
 * The one scope change worth checking mechanically. Everything else about
 * tone is judgment, but "helped the analytics team with their SQL queries"
 * becoming "wrote SQL queries for the analytics team" is a different claim —
 * and it's the claim an interviewer opens with. Measured on Haiku, with the
 * prompt already forbidding it in both directions.
 *
 * A hedge may be swapped for another hedge freely; what's refused is a hedged
 * bullet coming back with no hedge at all.
 */
const HEDGE_VERBS = [
  'helped',
  'assisted',
  'supported',
  'contributed',
  'participated',
  'collaborated',
  'aided',
  'volunteered',
  'shadowed',
];

/**
 * Shortest context string worth matching. Below this, a title like "IT" would
 * hit inside ordinary words and reject good rewrites.
 */
const MIN_CONTEXT_MATCH = 5;

/** The entry's heading, which the bullets sit underneath on a printed resume. */
export interface RewordContext {
  title: string;
  organization: string;
}

export type RewordCheck =
  | { ok: true; warning?: string }
  /** `reason` is shown to the student, so it says what the model did. */
  | { ok: false; reason: string };

/**
 * Decide whether one rewrite may be offered to the student.
 *
 * Rejects a rewrite that states a figure the original didn't, and one that
 * came back empty. Warns — but allows — on a dropped figure and on padding,
 * because neither invents anything and the student is looking at both versions
 * side by side.
 */
export function checkReword(
  original: string,
  reworded: string,
  context?: RewordContext,
): RewordCheck {
  const rewrite = reworded.trim();

  if (!rewrite) {
    return { ok: false, reason: 'came back empty' };
  }

  // Measured failure, not a hypothetical: asked to polish four bullets under
  // "Data Analyst Intern — Wasatch Health Group", mistral appended "at Wasatch
  // Health Group" to all four. On a resume the organization is already in the
  // heading directly above, so repeating it in every line is both padding and
  // information the bullet didn't carry. The prompt now forbids it; this is
  // what makes the ban hold on a model that doesn't listen.
  const inserted = contextInserted(original, rewrite, context);
  if (inserted) {
    return {
      ok: false,
      reason: `worked "${inserted}" into the line, which your resume already shows in the heading above`,
    };
  }

  if (hedgeLost(original, rewrite)) {
    return {
      ok: false,
      reason:
        'turns helping with something into having done it yourself, which is a bigger claim than your line makes',
    };
  }

  const before = extractFigures(original);
  const after = extractFigures(rewrite);

  const invented = [...after].filter((figure) => !before.has(figure));
  if (invented.length > 0) {
    return {
      ok: false,
      // Named, not just counted: a student who sees which number appeared can
      // tell at a glance that rejecting it was right.
      reason: `added ${invented.length === 1 ? 'a number' : 'numbers'} that your bullet doesn't have (${invented.join(', ')})`,
    };
  }

  const dropped = [...before].filter((figure) => !after.has(figure));
  if (dropped.length > 0) {
    return {
      ok: true,
      warning: `drops ${dropped.join(', ')} — your numbers are usually the strongest part of a bullet`,
    };
  }

  if (
    rewrite.length > original.length * PADDING_RATIO &&
    rewrite.length - original.length > PADDING_MIN_GROWTH
  ) {
    return { ok: true, warning: 'noticeably longer than yours, which often reads as padding' };
  }

  return { ok: true };
}

/**
 * The entry's own title or organization, if the rewrite added one the original
 * didn't mention. Null when it added neither.
 */
function contextInserted(
  original: string,
  rewrite: string,
  context: RewordContext | undefined,
): string | null {
  if (!context) return null;

  const before = original.toLowerCase();
  const after = rewrite.toLowerCase();

  for (const raw of [context.organization, context.title]) {
    const value = raw.trim();
    if (value.length < MIN_CONTEXT_MATCH) continue;

    const needle = value.toLowerCase();
    if (after.includes(needle) && !before.includes(needle)) return value;
  }

  return null;
}

/**
 * True when the original hedged its ownership and the rewrite doesn't.
 *
 * Only the opening verb is examined on the original: a bullet that *starts*
 * "Helped…" is making a hedged claim about the whole line, whereas "helped"
 * appearing later is usually incidental. The rewrite is searched anywhere,
 * because a faithful rewrite is free to move the hedge.
 */
function hedgeLost(original: string, rewrite: string): boolean {
  const opener = original.trim().toLowerCase();
  if (!HEDGE_VERBS.some((verb) => opener.startsWith(verb))) return false;

  const after = rewrite.toLowerCase();
  return !HEDGE_VERBS.some((verb) => after.includes(verb));
}
