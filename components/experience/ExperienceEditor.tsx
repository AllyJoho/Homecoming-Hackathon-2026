'use client';

// @/components/experience/ExperienceEditor.tsx
// The experience section of /resume: every entry, grouped into the four
// sections a resume actually has, each editable in place.
//
// Entries arrive here two ways and the UI says which: typed in by the student,
// or parsed out of a resume they pasted. That distinction is not decoration —
// a re-paste replaces the parsed ones and leaves hand-written ones alone, so
// the student needs to be able to see which is which before pasting again.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { Experience, ExperienceInput, ExperienceKind } from '@/types/experience';
import { EXPERIENCE_KINDS, formatDateRange } from '@/types/experience';
import { Button, Card, EmptyState, Tag } from '@/components/ui';
import { ExperienceForm } from './ExperienceForm';

export interface ExperienceEditorProps {
  experiences: Experience[];
}

/** Which row, if any, is in edit mode. 'new:<KIND>' while adding. */
type Editing = { kind: 'row'; id: string } | { kind: 'new'; section: ExperienceKind } | null;

export function ExperienceEditor({ experiences }: ExperienceEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  /** Re-render the server component so the list reflects the write. */
  const refresh = () => startTransition(() => router.refresh());

  async function send(url: string, method: string, body?: unknown) {
    const response = await fetch(url, {
      method,
      ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? 'That did not save.');
    }
  }

  async function create(input: ExperienceInput) {
    await send('/api/experience', 'POST', input);
    setEditing(null);
    refresh();
  }

  async function update(id: string, input: ExperienceInput) {
    await send(`/api/experience/${id}`, 'PUT', input);
    setEditing(null);
    refresh();
  }

  async function remove(id: string) {
    setError(null);
    try {
      await send(`/api/experience/${id}`, 'DELETE');
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete that.');
    }
  }

  if (experiences.length === 0 && editing === null) {
    return (
      <Card title="Your experience">
        <EmptyState
          title="Nothing here yet"
          description="Paste a resume above and this fills itself in, or add your first entry by hand."
          action={
            <Button size="sm" onClick={() => setEditing({ kind: 'new', section: 'WORK' })}>
              Add an entry
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card
      title="Your experience"
      subtitle="What a rendered resume is built from. Edit anything the paste got wrong."
      action={
        editing === null && (
          <Button size="sm" variant="secondary" onClick={() => setEditing({ kind: 'new', section: 'WORK' })}>
            Add an entry
          </Button>
        )
      }
    >
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      {editing?.kind === 'new' && (
        <div className="mb-6">
          <ExperienceForm
            defaultKind={editing.section}
            onSave={create}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <div className="flex flex-col gap-6">
        {EXPERIENCE_KINDS.map(({ kind, label }) => {
          const section = experiences.filter((entry) => entry.kind === kind);
          if (section.length === 0) return null;

          return (
            <section key={kind}>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {label}
              </h3>

              <ul className="flex flex-col gap-3">
                {section.map((entry) =>
                  editing?.kind === 'row' && editing.id === entry.id ? (
                    <li key={entry.id}>
                      <ExperienceForm
                        initial={entry}
                        onSave={(input) => update(entry.id, input)}
                        onCancel={() => setEditing(null)}
                      />
                    </li>
                  ) : (
                    <li
                      key={entry.id}
                      className="rounded-lg border border-zinc-200 p-3 dark:border-surface-border"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {entry.title || entry.organization}
                            {entry.title && entry.organization && (
                              <span className="font-normal text-zinc-600 dark:text-zinc-400">
                                {' '}
                                · {entry.organization}
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            {[formatDateRange(entry), entry.location].filter(Boolean).join(' · ')}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {entry.source === 'RESUME' && <Tag variant="info">from resume</Tag>}
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setEditing({ kind: 'row', id: entry.id })}
                          >
                            Edit
                          </Button>
                          <Button size="xs" variant="danger" onClick={() => remove(entry.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>

                      {entry.bullets.length > 0 && (
                        <ul className="mt-2 flex flex-col gap-1">
                          {entry.bullets.map((bullet, i) => (
                            <li
                              key={i}
                              className="text-sm text-zinc-700 dark:text-zinc-300"
                            >
                              • {bullet}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ),
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </Card>
  );
}
