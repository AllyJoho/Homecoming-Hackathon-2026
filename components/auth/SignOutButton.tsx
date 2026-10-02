// @/components/auth/SignOutButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth/client';

export interface SignOutButtonProps {
  /**
   * Replaces the default inline-link styling. The header's account menu passes
   * a full-width menu-row class; a bare link elsewhere passes nothing.
   */
  className?: string;
  /** Rendered before the label — the menu row wants a leading glyph. */
  icon?: React.ReactNode;
}

const DEFAULT_CLASS =
  'text-sm text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline ' +
  'disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-50';

export function SignOutButton({ className, icon }: SignOutButtonProps) {
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
      className={className ?? DEFAULT_CLASS}
    >
      {icon}
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
