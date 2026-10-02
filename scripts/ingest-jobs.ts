// @/scripts/ingest-jobs.ts
// Pulls real listings into the database so /recommendations has something to
// show the moment a student opens it.
//
//   npm run jobs:ingest                 # up to 25 new listings
//   npm run jobs:ingest -- --limit 5    # a quick check
//   npm run jobs:ingest -- --refresh    # re-extract listings already stored,
//                                       # for when the extraction changed
//
// Run it once before the demo. Listings already stored are skipped without a
// model call, so re-running is cheap and only picks up what's new.
//
// AI_PROVIDER decides what does the extracting. Against a local model this is
// roughly 30-60s per listing, so start with a small --limit; against Haiku
// it's about a second each.

import { ingestJobs } from '@/lib/jobs/ingest';
import { greenhouseSource, BOARDS } from '@/lib/jobs/sources/greenhouse';
import { aiCallTotals } from '@/lib/ai/log';
import { AI_PROVIDER, providerFor } from '@/lib/ai/provider';
import { countJobs } from '@/prisma/queries';
import { prisma } from '@/prisma/client';

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  const limit = Number(flag('limit') ?? 25);
  const boards = flag('boards')?.split(',').map((b) => b.trim()) ?? BOARDS;
  const refresh = process.argv.includes('--refresh');

  console.log(`\nIngesting jobs from Greenhouse: ${boards.join(', ')}`);
  console.log(`extraction on ${providerFor('job-skill-extraction')} (AI_PROVIDER=${AI_PROVIDER})`);
  console.log(`already in the database: ${await countJobs()} listings\n`);

  const started = Date.now();
  if (refresh) console.log('--refresh: re-extracting stored listings (this re-spends)\n');

  const result = await ingestJobs({
    source: greenhouseSource(boards),
    limit,
    refresh,
    onProgress: (message) => console.log(message),
  });

  const totals = aiCallTotals();
  console.log(`
done in ${((Date.now() - started) / 1000).toFixed(0)}s
  fetched        ${result.fetched}
  already stored ${result.alreadyStored}
  filtered out   ${result.filteredOut}  (never reached a model)
  extracted      ${result.extracted}
  irrelevant     ${result.irrelevant}  (no skills in our vocabulary)
  failed         ${result.failed}
  STORED         ${result.stored.length}

database now holds ${await countJobs()} listings
AI spend: ${totals.calls} calls, $${totals.costUsd.toFixed(4)}
`);

  await prisma.$disconnect();
}

main();
