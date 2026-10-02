'use client';

// @/components/experience/ExperienceForm.tsx
// The add/edit form for one experience entry.
//
// Dates are plain text inputs, not date pickers, because resumes say "Summer
// 2026" and a picker would force a student to pick a day they don't mean.
// Bullets are one textarea, split on newlines — typing a list is faster than
// managing a row of inputs, and it's how they already have it written down.

import { useState } from 'react';

import type { Experience, ExperienceInput, ExperienceKind } from '@/types/experience';
import { EXPERIENCE_KINDS } from '@/types/experience';
import { Button, SelectField, TextField } from '@/components/ui';
import { BulletReword } from './BulletReword';

export interface ExperienceFormProps {
  /** Omit to add a new entry. */
  initial?: Experience;
  /** Pre-selects the section when adding from one of its headers. */
  defaultKind?: ExperienceKind;
  onSave: (input: ExperienceInput) => Promise<void>;
  onCancel: () => void;
}

export function ExperienceForm({
  initial,
  defaultKind = 'WORK',
  onSave,
  onCancel,
}: ExperienceFormProps) {
  const [kind, setKind] = useState<ExperienceKind>(initial?.kind ?? defaultKind);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [organization, setOrganization] = useState(initial?.organization ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [startDate, setStartDate] = useState(initial?.startDate ?? '');
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [current, setCurrent] = useState(initial?.current ?? false);
  const [bulletText, setBulletText] = useState((initial?.bullets ?? []).join('\n'));

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const identified = title.trim().length > 0 || organization.trim().length > 0;

  // The textarea is the source of truth for bullets, so both saving and
  // rewording read them through here rather than each splitting their own way.
  const bullets = splitBullets(bulletText);

  async function save() {
    setPending(true);
    setError(null);
    try {
      await onSave({
        kind,
        title: title.trim(),
        organization: organization.trim(),
        location: location.trim() || undefined,
        startDate: startDate.trim() || undefined,
        endDate: current ? undefined : endDate.trim() || undefined,
        current,
        bullets,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save that.');
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-surface-raised">
      <SelectField
        label="Section"
        value={kind}
        onChange={(event) => setKind(event.target.value as ExperienceKind)}
        options={EXPERIENCE_KINDS.map(({ kind: value, label, hint }) => ({
          value,
          label: `${label} — ${hint}`,
        }))}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={kind === 'EDUCATION' ? 'Degree' : kind === 'PROJECT' ? 'Project name' : 'Role'}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={
            kind === 'EDUCATION'
              ? 'B.S. Information Systems'
              : kind === 'PROJECT'
                ? 'Course Planner'
                : 'Data Analyst Intern'
          }
        />
        <TextField
          label={kind === 'EDUCATION' ? 'School' : 'Organization'}
          value={organization}
          onChange={(event) => setOrganization(event.target.value)}
          placeholder={
            kind === 'EDUCATION'
              ? 'Brigham Young University'
              : kind === 'PROJECT'
                ? 'Personal project'
                : 'Wasatch Health Group'
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Free text on purpose — "Summer 2026" is a real answer. */}
        <TextField
          label="Start"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          placeholder="May 2026"
        />
        <TextField
          label="End"
          value={current ? '' : endDate}
          onChange={(event) => setEndDate(event.target.value)}
          placeholder="Aug 2026"
          disabled={current}
        />
        <TextField
          label="Location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Provo, UT"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={current}
          onChange={(event) => setCurrent(event.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600"
        />
        {kind === 'EDUCATION' ? 'Still studying here' : 'Still doing this'}
      </label>

      <div>
        <label
          htmlFor="bullets"
          className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Bullet points
          <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">
            one per line
          </span>
        </label>
        <textarea
          id="bullets"
          value={bulletText}
          onChange={(event) => setBulletText(event.target.value)}
          rows={5}
          placeholder={'Wrote SQL reports against a 40-table Postgres warehouse\nCut manual review time by 6 hours a week'}
          className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-surface dark:text-zinc-50"
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          What you did and what came of it. Numbers help.
        </p>
      </div>

      {/* Under the textarea it edits. Applying writes back into it rather than
          saving, so the student reviews the wording and then presses Save
          themselves — see BulletReword for why it never edits in place. */}
      <BulletReword
        kind={kind}
        title={title.trim()}
        organization={organization.trim()}
        bullets={bullets}
        onApply={(next) => setBulletText(next.join('\n'))}
        disabled={pending}
      />

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={pending || !identified} size="sm">
          {pending ? 'Saving…' : initial ? 'Save changes' : 'Add entry'}
        </Button>
        <Button onClick={onCancel} variant="ghost" size="sm" disabled={pending}>
          Cancel
        </Button>
        {!identified && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Needs a title or an organization.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * The textarea's lines as bullets: list markers stripped, blanks dropped.
 *
 * Students paste from a resume, and a pasted "• " would otherwise be saved
 * into the text and then rendered next to the marker the resume adds itself.
 */
function splitBullets(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^[\s•▪◦*-]+/, '').trim())
    .filter(Boolean);
}
