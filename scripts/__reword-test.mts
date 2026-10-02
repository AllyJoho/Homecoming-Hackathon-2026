import { applyGuard } from '@/lib/profile/reword';

let pass = 0, fail = 0;
function t(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) pass++;
  else { fail++; console.log(`FAIL ${name}\n  got  ${g}\n  want ${w}`); }
}
const ctx = { title: 'Data Analyst Intern', organization: 'Wasatch Health Group' };

// Happy path.
const ok = applyGuard(
  ['Helped with reports', 'Cut review time by 6 hours a week'],
  [
    { index: 0, reworded: 'Produced weekly reports', changed: true },
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
