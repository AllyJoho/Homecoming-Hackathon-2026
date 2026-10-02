import { checkReword, extractFigures } from '@/lib/profile/rewordGuard';

let pass = 0, fail = 0;
function t(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; }
  else { fail++; console.log(`FAIL ${name}\n  got  ${g}\n  want ${w}`); }
}

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
t('clean rewrite', checkReword('Helped with 6 reports a week', 'Produced 6 reports a week'), { ok: true });


// --- context insertion ---
const ctx = { title: 'Data Analyst Intern', organization: 'Wasatch Health Group' };
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
