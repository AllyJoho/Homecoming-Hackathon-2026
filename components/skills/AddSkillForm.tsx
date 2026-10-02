'use client';

// @/components/skills/AddSkillForm.tsx
// Free-text skill entry. The server normalizes against the canonical
// vocabulary (@/lib/profile/skills) and answers 400 for anything it doesn't
// recognize, so the error message here is the whole validation UI.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

export function AddSkillForm() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!value.trim()) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill: value }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Could not add that skill.');
      }

      setValue('');
      // The skill list is a server component, so re-fetch it rather than
      // duplicating the list in client state.
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={pending}
          placeholder="e.g. JavaScript, SQL, Figma"
          aria-label="Skill"
          className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-50"
        />
        <Button type="submit" disabled={pending || !value.trim()}>
          {pending ? 'Adding…' : 'Add'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
