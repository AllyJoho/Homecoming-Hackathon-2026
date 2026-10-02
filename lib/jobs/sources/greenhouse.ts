// @/lib/jobs/sources/greenhouse.ts
// Greenhouse's public job board API, one company at a time.
//
// Chosen over an aggregator (Adzuna, JSearch) for three reasons: no API key or
// signup, no rate limit to budget for, and we pick the companies — so the demo
// shows employers that actually recruit here instead of generic national
// postings. The cost is that it's per-company, hence BOARDS below.
//
// `?content=true` is what makes this usable: without it the endpoint returns
// titles and locations but no description, and the description is the only
// place a listing's actual requirements live.

import type { JobSource, RawListing } from './types';

/**
 * Companies to pull. Greenhouse board tokens — the slug in a company's
 * boards.greenhouse.io URL.
 *
 * Two groups, both deliberate:
 *
 *   Utah employers, for the local story — these are the companies BYU students
 *   actually interview with. The catch, measured: they post almost nothing
 *   junior. Across all four, 6 of 103 listings read as entry-level.
 *
 *   National tech, for the junior roles — Stripe alone lists ~54 internship
 *   and new-grad postings, Coinbase ~41, Robinhood ~30. Without these the
 *   board is 70% senior, which is the wrong product for a student.
 *
 * Boards come and go: a company that leaves Greenhouse starts returning 404 or
 * an empty list, which `fetchListings` reports and skips rather than failing
 * the whole run. Re-check with `npm run jobs:boards`.
 */
export const BOARDS = [
  // Utah
  'qualtrics',
  'lucidsoftware',
  'weave',
  'recursionpharmaceuticals',
  // National, junior-heavy
  'stripe',
  'coinbase',
  'robinhood',
  'samsara',
  'figma',
] as const;

const API = 'https://boards-api.greenhouse.io/v1/boards';

interface GreenhouseJob {
  id: number;
  title: string;
  company_name?: string;
  location?: { name?: string };
  absolute_url?: string;
  content?: string;
  departments?: { name?: string }[];
}

/**
 * HTML → plain text.
 *
 * Job descriptions arrive as marketing-formatted HTML. The model reads the
 * words, not the markup, and tags would be a third of the tokens — so they go
 * before the description is ever sent anywhere.
 */
export function htmlToText(html: string): string {
  return html
    // Block boundaries become newlines so bullet lists don't run together into
    // one sentence, which is where requirements usually live.
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^[ \t]+/gm, '')
    .trim();
}

async function fetchBoard(board: string): Promise<RawListing[]> {
  const response = await fetch(`${API}/${board}/jobs?content=true`, {
    // Ingest runs from a script or a POST route, never from a cached render.
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Greenhouse board "${board}" returned ${response.status}`);
  }

  const body = (await response.json()) as { jobs?: GreenhouseJob[] };

  return (body.jobs ?? []).map((job) => {
    const location = job.location?.name?.trim() || 'Not specified';
    return {
      id: `gh-${board}-${job.id}`,
      title: job.title.trim(),
      // company_name is per-listing and occasionally missing; the board slug is
      // a worse label but always there.
      company: job.company_name?.trim() || board,
      location,
      remote: /\bremote\b/i.test(location),
      url: job.absolute_url ?? `${API}/${board}/jobs/${job.id}`,
      description: htmlToText(job.content ?? ''),
      department: job.departments?.[0]?.name?.trim(),
    };
  });
}

export function greenhouseSource(boards: readonly string[] = BOARDS): JobSource {
  return {
    id: 'greenhouse',
    label: `Greenhouse (${boards.length} boards)`,

    async fetchListings(): Promise<RawListing[]> {
      // Boards in parallel, and one bad board doesn't sink the run — a demo an
      // hour from now shouldn't fail because a company changed ATS.
      const results = await Promise.allSettled(boards.map(fetchBoard));

      const listings: RawListing[] = [];
      for (const [i, result] of results.entries()) {
        if (result.status === 'fulfilled') {
          listings.push(...result.value);
        } else {
          console.warn(`[jobs] skipped board "${boards[i]}": ${result.reason}`);
        }
      }
      return listings;
    },
  };
}
