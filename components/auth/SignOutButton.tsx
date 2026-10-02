// @/components/auth/SignOutButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth/client';

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    await signOut();
    // The (main) layout guard reads the session on the server, so the tree has
    // to be refetched before navigating or it renders against the stale one.
    router.refresh();
    router.push('/login');
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-50"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
