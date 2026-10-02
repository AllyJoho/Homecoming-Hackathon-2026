// @/app/api/certificates/[certId]/pdf/route.ts
// The certificate as a downloadable PDF.
//
// Public, like the certificate page it mirrors — the link gets handed to
// recruiters, and a download that demands a login isn't shareable.
//
// Rendered on the server, which is the point: @react-pdf/renderer and its
// dependencies never reach the browser bundle, and the response is a real
// vector PDF with selectable text rather than a screenshot. One click, no
// print dialog, because `Content-Disposition: attachment` makes the browser
// save it.

import { renderToBuffer } from '@react-pdf/renderer';

import { absoluteUrl } from '@/lib/appUrl';
import { getCertificationByShareSlug } from '@/prisma/queries';
import { CertificateDocument } from '@/components/certificate/CertificateDocument';

/** Safe for a Content-Disposition filename on any platform. */
function filename(title: string, holder: string): string {
  const slug = `${holder}-${title}`
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  return `${slug || 'certificate'}.pdf`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ certId: string }> },
) {
  const { certId } = await params;

  const certification = await getCertificationByShareSlug(certId);
  if (!certification) {
    return new Response('Certificate not found.', { status: 404 });
  }

  const pdf = await renderToBuffer(
    <CertificateDocument
      holderName={certification.holderName}
      title={certification.title}
      level={certification.level}
      issuedAt={certification.issuedAt}
      verifyUrl={absoluteUrl(`/certificates/${certification.shareSlug}`)}
    />,
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${filename(certification.title, certification.holderName)}"`,
      // A certificate is immutable once earned, so it's safe to cache hard.
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
