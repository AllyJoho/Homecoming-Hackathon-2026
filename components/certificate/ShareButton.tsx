'use client';

// @/components/certificate/ShareButton.tsx
// [stretch] Copies the public certificate URL. Uses the Web Share sheet when
// the browser has one (mobile), clipboard otherwise.

import { useState } from 'react';
import { Button } from '@/components/ui';

export interface ShareButtonProps {
  /** Path only — the absolute URL is built from the current origin. */
  path: string;
  title: string;
}

export function ShareButton({ path, title }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL(path, window.location.origin).toString();

    if (navigator.share) {
      // Can reject when the user dismisses the sheet — not an error worth
      // surfacing.
      await navigator.share({ title, url }).catch(() => {});
      return;
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="secondary" onClick={share}>
      {copied ? 'Link copied' : 'Share'}
    </Button>
  );
}
