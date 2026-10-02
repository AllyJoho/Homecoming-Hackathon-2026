'use client';

// @/app/(main)/resume/preview/PrintButton.tsx
// window.print() is the export. The browser's print dialog has "Save as PDF"
// on every platform students use, so this is a real download without a PDF
// library or a server round trip.

import { Button } from '@/components/ui';

export function PrintButton() {
  return <Button onClick={() => window.print()}>Print or save as PDF</Button>;
}
