// @/lib/jobs/sources/types.ts
// What a job source hands the ingest pipeline: a listing as the board
// published it, before any AI has looked at it.
//
// Deliberately NOT @/types/job's `Job` — that type requires canonical skill
// slugs, and no job board publishes those. Turning a RawListing into a Job is
// exactly what @/lib/jobs/ingest does, and the AI step is how.

export interface RawListing {
  /**
   * Stable id, namespaced by source (`gh-lucidsoftware-5076057004`) so two
   * sources can't collide and re-running ingest updates rather than duplicates.
   */
  id: string;
  title: string;
  company: string;
  /** As published, e.g. "Salt Lake City, UT" or "Remote, US". */
  location: string;
  remote: boolean;
  url: string;
  /** Plain text. Sources strip their own markup before returning. */
  description: string;
  /** The board's own grouping (Greenhouse department). Used to filter. */
  department?: string;
}

export interface JobSource {
  /** Short id used in listing ids and logs. */
  readonly id: string;
  readonly label: string;
  /** Everything currently posted. Sources don't filter for relevance. */
  fetchListings(): Promise<RawListing[]>;
}
