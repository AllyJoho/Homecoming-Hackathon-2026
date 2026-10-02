'use client';

// @/app/certificates/[certId]/CertificateActions.tsx
// The share row under a public certificate: copy link, download PDF, and the
// two LinkedIn hand-offs.
//
// The LinkedIn buttons are real — they build LinkedIn's own URLs and would
// work unchanged on a deployed host. What they check first is whether the
// certificate URL is reachable from outside this machine. On localhost it
// isn't, so rather than opening LinkedIn and quietly attaching a dead link to
// someone's profile, they say so.
//
// That check is `isPubliclyReachable()`, not a hardcoded flag: set
// NEXT_PUBLIC_APP_URL on a deploy and these start working with no code change.

import { useState } from 'react';

import { Button, Modal } from '@/components/ui';
import { absoluteUrl, isPubliclyReachable } from '@/lib/appUrl';
import { addToProfileUrl, shareToFeedUrl } from '@/lib/certificates/linkedin';

export interface CertificateActionsProps {
  shareSlug: string;
  title: string;
  level: string;
  issuedAt: string;
}

export function CertificateActions({
  shareSlug,
  title,
  level,
  issuedAt,
}: CertificateActionsProps) {
  const [copied, setCopied] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const path = `/certificates/${shareSlug}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(absoluteUrl(path));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused (insecure context, denied permission).
      // Selecting the URL by hand still works, so this isn't worth an alert.
      setCopied(false);
    }
  }

  function openLinkedIn(build: (c: Parameters<typeof addToProfileUrl>[0]) => string) {
    if (!isPubliclyReachable()) {
      setBlocked(true);
      return;
    }

    const url = build({
      title,
      level,
      issuedAt,
      url: absoluteUrl(path),
      certId: shareSlug,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="secondary" onClick={copyLink}>
          {copied ? 'Link copied' : 'Copy link'}
        </Button>

        {/* A plain link, not fetch — the browser handles the download, and it
            still works with JavaScript disabled. */}
        <a href={`/api/certificates/${shareSlug}/pdf`} download>
          <Button variant="secondary">Download PDF</Button>
        </a>

        <Button variant="secondary" onClick={() => openLinkedIn(addToProfileUrl)}>
          Add to LinkedIn profile
        </Button>

        {/* `secondary` like its three siblings. This was `ghost`, which has no
            border and made the button look disabled next to the others. */}
        <Button variant="secondary" onClick={() => openLinkedIn(shareToFeedUrl)}>
          Share to LinkedIn
        </Button>
      </div>

      <Modal open={blocked} onClose={() => setBlocked(false)} title="Can't do this on localhost">
        <div className="flex flex-col gap-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            LinkedIn has to be able to open this certificate itself — it stores the link on
            your profile and fetches the page to build a preview. Right now the link is{' '}
            <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">
              {absoluteUrl(path)}
            </code>
            , which only resolves on this machine.
          </p>
          <p>
            Deploy the app and set <code className="font-mono text-xs">NEXT_PUBLIC_APP_URL</code>{' '}
            to its address, and both LinkedIn buttons start working — no code change needed.
          </p>
          <p className="text-zinc-500 dark:text-zinc-400">
            Copy link and Download PDF work fine right now.
          </p>
        </div>
      </Modal>
    </>
  );
}
