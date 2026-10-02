// @/app/api/jobs/ingest/route.ts
// "Load more listings" — fetches from the job board, extracts skills, stores.
//
// POST, and never called during a render: this spends a model call per new
// listing and writes to the database. Everything it stores is permanent, so
// the cost is paid once and every later page load is a plain read.
//
// The small default limit is deliberate. Extraction is ~1-2s per listing on
// Haiku but 30-60s on a local model, and a button that might run for twenty
// minutes is a button nobody presses twice.

import { NextResponse } from 'next/server';

import { getSessionUser, unauthorized } from '@/lib/auth/session';
import { ingestJobs } from '@/lib/jobs/ingest';
import { AiError } from '@/lib/ai/provider';
import { countJobs } from '@/prisma/queries';

/** New listings per press. */
const BATCH = 8;

export async function POST() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const result = await ingestJobs({ limit: BATCH });

    return NextResponse.json({
      stored: result.stored.length,
      total: await countJobs(),
      // Enough detail for the UI to explain a zero rather than look broken.
      exhausted: result.stored.length === 0,
      skipped: {
        alreadyStored: result.alreadyStored,
        filteredOut: result.filteredOut,
        irrelevant: result.irrelevant,
        failed: result.failed,
      },
    });
  } catch (error) {
    if (error instanceof AiError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    // A board being unreachable is the other likely failure here.
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load listings.' },
      { status: 502 },
    );
  }
}
