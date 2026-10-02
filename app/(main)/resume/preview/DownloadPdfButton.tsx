// @/app/(main)/resume/preview/DownloadPdfButton.tsx
// Downloads the resume from /api/resume/pdf.
//
// A plain anchor with `download`, not a fetch: the browser handles the save,
// it works without JavaScript, and there's no blob URL to clean up. The route
// sends Content-Disposition: attachment, so there's no print dialog — same
// shape as the certificate's download.
//
// Not a client component by necessity — Button has no hooks — but colocated
// here because nothing else uses it.

import { Button } from '@/components/ui';

export function DownloadPdfButton() {
  return (
    <a href="/api/resume/pdf" download>
      <Button size="sm">Download PDF</Button>
    </a>
  );
}
