// @/app/(main)/certificates/[certId]/page.tsx
// [stretch] The certificate page.
//
// `certId` is the certificate's `shareSlug`, not its primary key, so the URL
// can be handed out without exposing database ids.
//
// NOTE: this sits inside the (main) group, so it currently requires a session
// — a recruiter following the link would be bounced to /login. To make sharing
// actually public, move this route out to `app/certificates/[certId]/` (a
// sibling of the groups) so the (main) layout's guard doesn't wrap it.

import { notFound } from 'next/navigation';
import { getCertificationByShareSlug } from '@/lib/db/queries';
import { CertificateView } from '@/components/certificate/CertificateView';
import { ShareButton } from '@/components/certificate/ShareButton';

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ certId: string }>;
}) {
  const { certId } = await params;

  const certification = await getCertificationByShareSlug(certId);
  if (!certification) notFound();

  return (
    <div className="flex flex-col gap-6">
      <CertificateView
        holderName={certification.holderName}
        title={certification.title}
        score={certification.score}
        issuedAt={certification.issuedAt}
      />
      <div className="flex justify-center">
        <ShareButton
          path={`/certificates/${certification.shareSlug}`}
          title={`${certification.title} — ${certification.holderName}`}
        />
      </div>
    </div>
  );
}
