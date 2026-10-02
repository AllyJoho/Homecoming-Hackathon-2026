'use client';

// @/components/applications/AddJobForm.tsx
// Manual entry for the tracker — a job the student found somewhere this app
// doesn't ingest.
//
// This is the other half of the Save button on a job match: same table, same
// statuses, but no Job row behind it, so the title and company typed in here
// are the only record of what the listing was. That's why they're required and
// the rest isn't.

import { useState } from 'react';

import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_META,
  type ApplicationStatus,
} from '@/types/application';
import { Button, Modal, SelectField, TextField } from '@/components/ui';

export interface AddJobFormProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful save, so the parent can refresh and close. */
  onAdded: () => void;
}

export function AddJobForm({ open, onClose, onAdded }: AddJobFormProps) {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>('SAVED');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setTitle('');
    setCompany('');
    setLocation('');
    setUrl('');
    setStatus('SAVED');
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    setError(null);
    setSaving(true);

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          company: company.trim(),
          location: location.trim() || undefined,
          url: url.trim() || undefined,
          status,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Could not save that job.');
      }

      reset();
      onAdded();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add a job"
    >
      <form onSubmit={submit} className="flex flex-col gap-3">
        <TextField
          label="Job title"
          value={title}
          required
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Software Engineer Intern"
        />
        <TextField
          label="Company"
          value={company}
          required
          onChange={(event) => setCompany(event.target.value)}
          placeholder="Qualtrics"
        />
        <TextField
          label="Location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Provo, UT"
        />
        <TextField
          label="Link"
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://…"
          helper="Optional, but it's what makes the row clickable later."
        />
        <SelectField
          label="Status"
          value={status}
          options={APPLICATION_STATUSES.map((value) => ({
            value,
            label: APPLICATION_STATUS_META[value].label,
          }))}
          onChange={(event) => setStatus(event.target.value as ApplicationStatus)}
        />

        {error && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving || !title.trim() || !company.trim()}>
            {saving ? 'Saving…' : 'Add job'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
