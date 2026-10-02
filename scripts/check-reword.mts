// @/scripts/check-reword.mts
// Checks the safety net under the "Reword with AI" button. No model call, no
// database, no API key — run it with `npm run check:reword`.
//
// Two things are verified, and they are the two that would do real damage if
// they broke quietly.
//
// First @/lib/profile/rewordGuard: whether a rewrite that invented a figure,
// or worked the entry's own heading into the line, is refused. The button
// promises the student that their numbers and scope are kept, and that promise
// is this function — the prompt only asks.
//
// Then applyGuard's index pairing. The model returns rewrites labelled by
// index, and nothing in the schema stops it returning four for five bullets or
// returning them out of order. Showing a student bullet 3's rewrite labelled as
// bullet 2 would be worse than any rewrite the guard rejects, so the
// out-of-order, short, duplicate and out-of-range cases are all pinned here.

import { checkReword, extractFigures } from '@/lib/profile/rewordGuard';
import { applyGuard } from '@/lib/profile/reword';

let pass = 0;
let fail = 0;

/** The entry heading both halves reword bullets underneath. */
const ctx = { title: 'Data Analyst Intern', organization: 'Wasatch Health Group' };

function t(name: string, got: unknown, want: unknown) {
  const got_ = JSON.stringify(got);
  const want_ = JSON.stringify(want);
  if (got_ === want_) {
    pass++;
    return;
  }
  fail++;
  console.log(`FAIL ${name}\n  got  ${got_}\n  want ${want_}`);
}

// ─── the guard itself ────────────────────────────────────────────────────────

// --- figure extraction ---
t('plain', [...extractFigures('Wrote 40 reports')], ['40']);
t('comma', [...extractFigures('Managed $40,000 budget')], ['40000']);
t('percent sign', [...extractFigures('Cut time 20%')], ['20%']);
t('percent word', [...extractFigures('Cut time by 20 percent')], ['20%']);
t('pct', [...extractFigures('Cut time 20 pct')], ['20%']);
t('number word', [...extractFigures('Led a team of three')], ['3']);
t('hyphenated', [...extractFigures('a 40-table warehouse')], ['40']);
t('decimal', [...extractFigures('Saved 3.5 hours')], ['3.5']);
t('year', [...extractFigures('Shipped in 2026')], ['2026']);
t('none', [...extractFigures('Helped with the website')], []);
t('multiple', [...extractFigures('6 hours a week across 3 teams')], ['6','3']);

// --- the rejection that matters: invented numbers ---
const r1 = checkReword('Led a team on the redesign', 'Led a team of three engineers on the redesign');
t('invents number -> reject', r1.ok, false);
t('invents number -> names it', !r1.ok && r1.reason.includes('3'), true);

const r2 = checkReword('Improved report speed', 'Improved report speed by 40%');
t('invents percent -> reject', r2.ok, false);

// --- word/numeral swap is NOT a change ---
t('3 -> three ok', checkReword('Led a team of 3', 'Directed a team of three'), { ok: true });
t('40,000 -> 40000 ok', checkReword('Managed $40,000', 'Administered a 40000 budget').ok, true);
t('20% -> 20 percent ok', checkReword('Cut time 20%', 'Reduced turnaround by 20 percent'), { ok: true });

// --- dropped figure: allowed, warned ---
const d = checkReword('Wrote SQL against a 40-table warehouse', 'Authored SQL queries against a large warehouse');
t('drops number -> ok', d.ok, true);
t('drops number -> warns', d.ok && typeof d.warning === 'string' && d.warning.includes('40'), true);

// --- padding: allowed, warned ---
const p = checkReword('Built a course planner', 'Engineered and delivered a comprehensive course-planning platform for student academic scheduling');
t('padding -> ok', p.ok, true);
t('padding -> warns', p.ok && (p.warning ?? '').includes('padding'), true);

// --- short bullet growing a little is not padding ---
t('short growth not padded', checkReword('Led onboarding', 'Directed onboarding'), { ok: true });

// --- empty ---
t('empty -> reject', checkReword('Did a thing', '   ').ok, false);

// --- clean rewrite, no notes ---
t('clean rewrite', checkReword('Wrote 6 reports a week', 'Produced 6 reports a week'), { ok: true });
t('hedge dropped even with figures intact',
  checkReword('Helped with 6 reports a week', 'Produced 6 reports a week').ok, false);


// --- context insertion ---
const c1 = checkReword('Maintained the reporting spreadsheets', 'Maintained reporting spreadsheets at Wasatch Health Group', ctx);
t('inserts org -> reject', c1.ok, false);
t('inserts org -> names it', !c1.ok && c1.reason.includes('Wasatch Health Group'), true);

const c2 = checkReword('Wrote queries', 'Served as Data Analyst Intern writing queries', ctx);
t('inserts title -> reject', c2.ok, false);

t('org already in original -> ok',
  checkReword('Built tooling for Wasatch Health Group', 'Developed tooling for Wasatch Health Group', ctx),
  { ok: true });

t('no context -> org text allowed',
  checkReword('Maintained spreadsheets', 'Maintained spreadsheets at Wasatch Health Group'),
  { ok: true });

t('short title not matched',
  checkReword('Fixed bugs', 'Resolved bugs', { title: 'IT', organization: 'BYU' }),
  { ok: true });

// Context rule must not shadow the figure rule for a clean rewrite.
t('clean rewrite with context',
  checkReword('Cut review time by 6 hours a week', 'Reduced review time by 6 hours per week', ctx),
  { ok: true });

// --- ownership hedges must survive ---
const h1 = checkReword('Helped the analytics team with their SQL queries', 'Wrote SQL queries for the analytics team', ctx);
t('hedge dropped -> reject', h1.ok, false);
t('hedge dropped -> explained', !h1.ok && h1.reason.includes('bigger claim'), true);

t('hedge swapped for hedge ok',
  checkReword('Helped the analytics team with their SQL queries', 'Assisted the analytics team with SQL queries', ctx),
  { ok: true });
t('contributed counts as hedge',
  checkReword('Helped reduce food waste', 'Contributed to reducing food waste', ctx),
  { ok: true });
t('collaborated counts as hedge',
  checkReword('Assisted with budget planning', 'Collaborated on budget planning', ctx),
  { ok: true });

// A strong verb is not a hedge, so these are untouched by the rule.
t('led is not hedged',
  checkReword('Led the migration', 'Directed the migration', ctx),
  { ok: true });
t('hedge mid-sentence does not trigger',
  checkReword('Rebuilt the pipeline, which helped the team', 'Rebuilt the data pipeline', ctx),
  { ok: true });

// ─── pairing rewrites back to their bullets ──────────────────────────────────

// Happy path.
const ok = applyGuard(
  ['Helped with reports', 'Cut review time by 6 hours a week'],
  [
    // Hedge kept, so this one is offered — see hedgeLost in rewordGuard.
    { index: 0, reworded: 'Assisted with weekly reporting', changed: true },
    { index: 1, reworded: 'Reduced review time by 6 hours per week', changed: true },
  ],
  ctx,
);
t('both accepted', ok.map((b) => b.changed), [true, true]);
t('no spurious notes', ok.map((b) => b.note), [undefined, undefined]);

// THE case this guard exists for: an invented figure is refused.
const invented = applyGuard(
  ['Led a team on the redesign'],
  [{ index: 0, reworded: 'Led a team of 4 engineers on the redesign', changed: true }],
  ctx,
);
t('invented figure not offered', invented[0].changed, false);
t('invented figure keeps original', invented[0].suggestion, 'Led a team on the redesign');
t('invented figure explained', invented[0].note?.includes("doesn't have (4)"), true);

// Org worked into the line is refused.
const org = applyGuard(
  ['Maintained the spreadsheets'],
  [{ index: 0, reworded: 'Maintained spreadsheets at Wasatch Health Group', changed: true }],
  ctx,
);
t('org insertion refused', org[0].changed, false);
t('org insertion explained', org[0].note?.includes('Wasatch Health Group'), true);

// Dropped figure is offered, with a warning.
const dropped = applyGuard(
  ['Wrote SQL against a 40-table warehouse'],
  [{ index: 0, reworded: 'Authored SQL against a large warehouse', changed: true }],
  ctx,
);
t('dropped figure offered', dropped[0].changed, true);
t('dropped figure warned', dropped[0].note?.includes('40'), true);

// Out-of-order response must not cross-pair bullets.
const shuffled = applyGuard(
  ['First bullet', 'Second bullet', 'Third bullet'],
  [
    { index: 2, reworded: 'Third rewritten', changed: true },
    { index: 0, reworded: 'First rewritten', changed: true },
    { index: 1, reworded: 'Second rewritten', changed: true },
  ],
  ctx,
);
t('out of order pairs correctly', shuffled.map((b) => b.suggestion),
  ['First rewritten', 'Second rewritten', 'Third rewritten']);

// Short response: the missing bullet is kept, the others still work.
const short = applyGuard(
  ['Alpha bullet', 'Beta bullet'],
  [{ index: 0, reworded: 'Alpha rewritten', changed: true }],
  ctx,
);
t('missing index kept', short[1].suggestion, 'Beta bullet');
t('missing index flagged', short[1].note?.includes('skipped'), true);
t('present index still applied', short[0].suggestion, 'Alpha rewritten');

// Duplicate index must not overwrite an already-matched bullet.
const dupe = applyGuard(
  ['Alpha bullet', 'Beta bullet'],
  [
    { index: 0, reworded: 'Alpha first', changed: true },
    { index: 0, reworded: 'Alpha second', changed: true },
  ],
  ctx,
);
t('duplicate index: first wins', dupe[0].suggestion, 'Alpha first');
t('duplicate index: other bullet kept', dupe[1].changed, false);

// Garbage index is ignored rather than throwing.
const bad = applyGuard(
  ['Only bullet'],
  [{ index: 99, reworded: 'Nope', changed: true }],
  ctx,
);
t('out-of-range index ignored', bad[0].suggestion, 'Only bullet');

// changed:false is respected even when text differs.
const declined = applyGuard(
  ['Already good bullet with 3 things'],
  [{ index: 0, reworded: 'Something else entirely', changed: false }],
  ctx,
);
t('changed:false respected', declined[0].suggestion, 'Already good bullet with 3 things');

// Empty rewrite refused.
const empty = applyGuard(['A bullet'], [{ index: 0, reworded: '   ', changed: true }], ctx);
t('empty rewrite refused', empty[0].changed, false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
