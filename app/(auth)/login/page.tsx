'use client';

// @/app/(auth)/login/page.tsx
// ⚠️  HACKATHON PLACEHOLDER AUTH: email only, no password. See
// @/lib/auth/session for what has to change before this is real.
//
// This route group has no layout of its own, so it renders without the app
// nav — a signed-out visitor shouldn't see links they can't use.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import { APP_NAME } from '@/lib/appConfig';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Could not sign in.');
      }

      // The session cookie is set by the route; refresh so the server
      // components in (main) see it, then navigate.
      router.refresh();
      router.push('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Prove your skills, earn certificates, find jobs that fit.
        </p>
      </div>

      <Card title="Sign in">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@byu.edu"
              className="rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Optional — defaults to your email handle"
              className="rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-50"
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" disabled={pending}>
            {pending ? 'Signing in…' : 'Continue'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
