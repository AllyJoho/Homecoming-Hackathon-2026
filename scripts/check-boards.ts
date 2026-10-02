// @/scripts/check-boards.ts
// Are the configured Greenhouse boards still live, and what do they hold?
//
//   npm run jobs:boards
//
// Worth running before a demo. Boards disappear when a company changes ATS,
// and this says so in a second instead of `jobs:ingest` quietly storing less
// than you expected. No AI, no database — just the boards.

import { BOARDS } from '@/lib/jobs/sources/greenhouse';

const JUNIOR =
  /\b(intern|internship|co-?op|apprentice|new.?grad|university|early.?career|junior|jr\.?|entry.?level|associate)\b/i;
const LOCAL =
  /\b(utah|ut|provo|orem|lehi|draper|sandy|american fork|pleasant grove|salt lake|slc)\b/i;

async function main() {
  console.log(`\nChecking ${BOARDS.length} Greenhouse boards\n`);
  let total = 0;
  let junior = 0;

  for (const board of BOARDS) {
    try {
      const response = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${board}/jobs`,
        { cache: 'no-store', signal: AbortSignal.timeout(15_000) },
      );
      if (!response.ok) {
        console.log(`  ${board.padEnd(26)} HTTP ${response.status}`);
        continue;
      }

      const body = (await response.json()) as {
        jobs?: { title: string; location?: { name?: string } }[];
      };
      const jobs = body.jobs ?? [];
      const jr = jobs.filter((job) => JUNIOR.test(job.title));
      const local = jobs.filter((job) => LOCAL.test(job.location?.name ?? ''));

      total += jobs.length;
      junior += jr.length;
      console.log(
        `  ${board.padEnd(26)} ${String(jobs.length).padStart(4)} listings · ${String(jr.length).padStart(3)} junior · ${String(local.length).padStart(3)} Utah`,
      );
    } catch (error) {
      console.log(`  ${board.padEnd(26)} unreachable (${error instanceof Error ? error.message : error})`);
    }
  }

  console.log(`\n  ${total} listings reachable, ${junior} of them junior\n`);
}

main();
