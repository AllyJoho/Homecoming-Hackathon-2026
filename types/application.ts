// @/types/application.ts
// The application tracker's shapes. Unlike @/types/job — ingested content the
// pipeline owns — these describe a student's own history, which is why the
// listing fields are copied onto the application rather than read through it.
//
// Kept separate from the Prisma row types for the same reason @/types/profile
// is: the shapes the app reasons over shouldn't shift when a column is renamed.

/** Where an application sits in the pipeline. Mirrors the Prisma enum. */
export type ApplicationStatus = 'SAVED' | 'APPLIED' | 'INTERVIEWING' | 'OFFER' | 'REJECTED';

/**
 * The pipeline in order, for the board columns and the status dropdown.
 *
 * Declared once here because three places need the same order — reordering the
 * Prisma enum would not reorder a UI that hard-coded it.
 */
export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'SAVED',
  'APPLIED',
  'INTERVIEWING',
  'OFFER',
  'REJECTED',
];

/** Labels and hues per status, so the tracker and the save button agree. */
export const APPLICATION_STATUS_META: Record<
  ApplicationStatus,
  { label: string; blurb: string; variant: 'neutral' | 'info' | 'accent' | 'success' | 'error' }
> = {
  SAVED: { label: 'Saved', blurb: "Bookmarked — you haven't applied yet.", variant: 'neutral' },
  APPLIED: { label: 'Applied', blurb: 'Submitted and waiting to hear back.', variant: 'info' },
  INTERVIEWING: { label: 'Interviewing', blurb: 'They got back to you.', variant: 'accent' },
  OFFER: { label: 'Offer', blurb: 'They want you.', variant: 'success' },
  REJECTED: {
    label: 'Rejected',
    blurb: 'Closed out. Worth keeping for the record.',
    variant: 'error',
  },
};

export interface Application {
  id: string;
  /**
   * The ingested listing this came from, or null when the student added the
   * job by hand. Present means the match data is still reachable; absent is
   * not an error.
   */
  jobId: string | null;
  title: string;
  company: string;
  location?: string;
  url?: string;
  status: ApplicationStatus;
  notes?: string;
  /** When the status first reached APPLIED. */
  appliedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** What the POST route accepts. `jobId` set means "save this ingested listing". */
export interface NewApplication {
  jobId?: string;
  title: string;
  company: string;
  location?: string;
  url?: string;
  status?: ApplicationStatus;
  notes?: string;
}
