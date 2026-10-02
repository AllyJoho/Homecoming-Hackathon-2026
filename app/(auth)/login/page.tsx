'use client';

// @/app/(auth)/login/page.tsx
// Sign in or create an account, both through Better Auth (see @/lib/auth/server).
// Passwords are scrypt-hashed onto Account.password; the session cookie is
// signed, httpOnly, and expires after a week.
//
// The demo buttons are a convenience for judging and local work. They call the
// demo-login endpoint, which only exists outside production and only ever
// issues a session for a seeded `isDemo` account — see @/lib/auth/demoLogin.
//
// This route group has no layout of its own, so it renders without the app
// nav — a signed-out visitor shouldn't see links they can't use.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Logo, TextField } from '@/components/ui';
import { APP_NAME } from '@/lib/appConfig';
import { demoLogin, signIn, signUp } from '@/lib/auth/client';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoUsers, setDemoUsers] = useState<{ name: string; email: string }[]>([]);

  // 404s in production, where the endpoint is absent — the buttons just don't
  // render then.
  useEffect(() => {
    fetch('/api/auth/demo-users')
      .then((res) => (res.ok ? res.json() : { users: [] }))
      .then((body: { users?: { name: string; email: string }[] }) => setDemoUsers(body.users ?? []))
      .catch(() => setDemoUsers([]));
  }, []);

  // The (main) layout reads the session on the server, so the tree has to be
  // refetched before navigating or the guard still sees no session.
  function enter() {
    router.refresh();
    router.push('/');
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const { error: authError } =
      mode === 'signup'
        ? await signUp.email({ email, password, name: name.trim() || email.split('@')[0] })
        : await signIn.email({ email, password });

    if (authError) {
      setError(authError.message ?? 'Could not sign in.');
      setPending(false);
      return;
    }
    enter();
  }

  async function onDemo(demoEmail: string) {
    setPending(true);
    setError(null);
    try {
      await demoLogin(demoEmail);
      enter();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Demo sign-in failed.');
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6">
      {/* The mark carries the branding on the one screen with no app bar. */}
      <div>
        <Logo className="h-9 w-9" />
        <h1 className="mt-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Prove your skills, earn certificates, find jobs that fit.
        </p>
      </div>

      <Card title={mode === 'signup' ? 'Create an account' : 'Sign in'}>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          {mode === 'signup' && (
            <TextField
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Optional"
              helper="Defaults to your email handle."
            />
          )}

          <TextField
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@byu.edu"
          />

          <TextField
            label="Password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            // The form-level failure (bad credentials, email taken) belongs on
            // the field the user would retype, not in a banner above the form.
            error={error}
          />

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={pending}
            loadingLabel={mode === 'signup' ? 'Creating account…' : 'Signing in…'}
          >
            {mode === 'signup' ? 'Create account' : 'Sign in'}
          </Button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signup' ? 'signin' : 'signup');
              setError(null);
            }}
            className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
          >
            {mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}
          </button>
        </form>
      </Card>

      {demoUsers.length > 0 && (
        <Card title="Demo accounts">
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
            Seeded accounts for trying the app out. Local and preview only — these buttons are gone
            in a production build.
          </p>
          <div className="flex flex-col gap-2">
            {demoUsers.map((user) => (
              <Button
                key={user.email}
                type="button"
                variant="secondary"
                fullWidth
                icon="arrowRight"
                iconPosition="right"
                onClick={() => onDemo(user.email)}
                disabled={pending}
              >
                Continue as {user.name}
              </Button>
            ))}
          </div>
        </Card>
      )}
    </main>
  );
}
