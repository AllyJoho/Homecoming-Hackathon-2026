'use client';

// @/components/applications/ApplicationTracker.tsx
// The application tracker: every job a student has saved or applied to, in
// pipeline order.
//
// A list grouped by status rather than a drag-and-drop kanban. Columns look
// better in a screenshot, but five columns on a phone is four of them offscreen,
// and the status dropdown is the same two clicks as a drag without needing a
// pointer at all.
//
// The server reads the rows (prisma/queries.ts → listApplications) and this
// owns only the optimistic move between groups while the PATCH is in flight —
// the same useOptimistic shape SkillBoard uses, for the same reason: the row
// holds its new group for exactly as long as the transition runs, so there's no
// window where local state and the server disagree.

import { useMemo, useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_META,
  type Application,
  type ApplicationStatus,
} from '@/types/application';
import { Button, Card, EmptyState, GROUP_HEADING, Tag } from '@/components/ui';
import { AddJobForm } from './AddJobForm';

export interface ApplicationTrackerProps {
  applications: Application[];
}

/** A row moved to a new status, pending the server catching up. */
type Move = { id: string; status: ApplicationStatus };

export function ApplicationTracker({ applications }: ApplicationTrackerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const [rows, moveRow] = useOptimistic(applications, (current: Application[], move: Move) =>
    current.map((row) => (row.id === move.id ? { ...row, status: move.status } : row)),
  );
  const [, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const byStatus = new Map<ApplicationStatus, Application[]>(
      APPLICATION_STATUSES.map((status) => [status, []]),
    );
    for (const row of rows) byStatus.get(row.status)?.push(row);
    return byStatus;
  }, [rows]);

  function withPending(id: string, work: () => Promise<void>) {
    setError(null);
    setPendingIds((current) => new Set(current).add(id));

    startTransition(async () => {
      try {
        await work();
        router.refresh();
      } catch (caught) {
        // No rollback: ending the transition without a refresh drops the
        // optimistic move on its own.
        setError(caught instanceof Error ? caught.message : 'Something went wrong.');
      } finally {
        setPendingIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }
    });
  }

  function setStatus(id: string, status: ApplicationStatus) {
    withPending(id, async () => {
      moveRow({ id, status });
      const response = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error(await errorFrom(response));
    });
  }

  function remove(id: string) {
    withPending(id, async () => {
      const response = await fetch(`/api/applications/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await errorFrom(response));
    });
  }

  const applied = rows.filter((row) => row.status !== 'SAVED').length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {rows.length === 0
            ? 'Nothing tracked yet.'
            : `${rows.length} tracked · ${applied} applied to`}
        </p>
        <Button size="sm" onClick={() => setAdding(true)}>
          Add job
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Save a listing from your job matches, or add a job you found somewhere else."
          action={
            <Button size="sm" onClick={() => setAdding(true)}>
              Add job
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {APPLICATION_STATUSES.map((status) => {
            const group = grouped.get(status) ?? [];
            // Empty stages are hidden rather than shown as empty columns: an
            // Offer heading over nothing reads as a rejection.
            if (group.length === 0) return null;
            const meta = APPLICATION_STATUS_META[status];

            return (
              <Card
                key={status}
                title={meta.label}
                subtitle={meta.blurb}
                action={<Tag variant={meta.variant}>{group.length}</Tag>}
                flush
              >
                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {group.map((row) => (
                    <ApplicationRow
                      key={row.id}
                      application={row}
                      pending={pendingIds.has(row.id)}
                      onStatusChange={(next) => setStatus(row.id, next)}
                      onRemove={() => remove(row.id)}
                    />
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      <AddJobForm
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={() => {
          setAdding(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function ApplicationRow({
  application,
  pending,
  onStatusChange,
  onRemove,
}: {
  application: Application;
  pending: boolean;
  onStatusChange: (status: ApplicationStatus) => void;
  onRemove: () => void;
}) {
  return (
    <li
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 ${pending ? 'opacity-60' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {application.url ? (
            <a
              href={application.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900 dark:decoration-zinc-600 dark:hover:decoration-zinc-50"
            >
              {application.title}
            </a>
          ) : (
            application.title
          )}
        </p>
        <p className={`${GROUP_HEADING} mt-0.5 normal-case`}>
          {application.company}
          {application.location ? ` · ${application.location}` : ''}
          {application.appliedAt ? ` · applied ${relativeDay(application.appliedAt)}` : ''}
          {/* A manual row has no listing behind it, so say so rather than
              letting it look identical to a tracked match. */}
          {application.jobId === null && ' · added by you'}
        </p>
      </div>

      <label className="sr-only" htmlFor={`status-${application.id}`}>
        Status for {application.title}
      </label>
      <select
        id={`status-${application.id}`}
        value={application.status}
        disabled={pending}
        onChange={(event) => onStatusChange(event.target.value as ApplicationStatus)}
        className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs outline-none focus:border-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-50"
      >
        {APPLICATION_STATUSES.map((status) => (
          <option key={status} value={status}>
            {APPLICATION_STATUS_META[status].label}
          </option>
        ))}
      </select>

      <Button variant="ghost" size="sm" disabled={pending} onClick={onRemove}>
        Remove
      </Button>
    </li>
  );
}

/** "today" / "yesterday" / "6 days ago" / a date once it's older than a week. */
function relativeDay(iso: string): string {
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

async function errorFrom(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? 'Could not save that change.';
}
