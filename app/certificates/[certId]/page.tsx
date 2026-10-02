// @/app/certificates/[certId]/page.tsx
// The public certificate page.
//
// Sits OUTSIDE the (main) route group deliberately. That group's layout calls
// `requireSessionUser`, which redirects — so while this route lived there,
// every shared link bounced the recipient to /login and sharing was broken by
// construction. A credential nobody else can open isn't a credential.
//
// `certId` in the URL is the certificate's `shareSlug`, not its primary key,
// so handing the link out never exposes a database id.
//
// No score is rendered here — see CertificateView's `showScore`. The holder
// sees their percentage inside the app; a recruiter sees the level.
//
// Being outside the group also means no nav, which is correct for a stranger
// and a DEAD END for a signed-in student — they land here from their own
// skills page with no way back. So the session is read without requiring one:
// `getSessionUser` returns null instead of redirecting, and the page renders
// the normal site header when there is a session and a bare public page when
// there isn't.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { APP_NAME } from '@/lib/appConfig';
import { absoluteUrl } from '@/lib/appUrl';
import { getSessionUser } from '@/lib/auth/session';
import { getCertificationByShareSlug } from '@/prisma/queries';
import { CertificateView } from '@/components/certificate/CertificateView';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { CertificateActions } from './CertificateActions';

/**
 * Open Graph tags, so a pasted link renders as a card rather than a raw URL
 * in LinkedIn, Slack, or iMessage.
 *
 * Note these only do anything once the app is on a public host — the services
 * that read them have to be able to fetch the page.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ certId: string }>;
}): Promise<Metadata> {
  const { certId } = await params;
  const certification = await getCertificationByShareSlug(certId);

  if (!certification) return { title: 'Certificate not found' };

  const title = `${certification.holderName} — ${certification.level} in ${certification.title}`;
  // "an Expert", "a Proficient" — the levels start with both vowels and
  // consonants, so the article can't be hardcoded.
  const article = /^[aeiou]/i.test(certification.level) ? 'an' : 'a';
  const description = `${certification.holderName} earned ${article} ${certification.level} certificate in ${certification.title} from ${APP_NAME}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      url: absoluteUrl(`/certificates/${certification.shareSlug}`),
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ certId: string }>;
}) {
  const { certId } = await params;

  // Note the order: the certificate is public, so a missing one is a 404 for
  // everybody, signed in or not.
  const [certification, viewer] = await Promise.all([
    getCertificationByShareSlug(certId),
    getSessionUser(),
  ]);
  if (!certification) notFound();

  return (
    <>
      {viewer && <SiteHeader userName={viewer.name} />}

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
        <CertificateView
          holderName={certification.holderName}
          title={certification.title}
          score={certification.score}
          level={certification.level}
          issuedAt={certification.issuedAt}
          showScore={false}
        />

        <CertificateActions
          shareSlug={certification.shareSlug}
          title={certification.title}
          level={certification.level}
          issuedAt={certification.issuedAt}
        />

        {/* Signed-in students have the nav above; this is for everyone else,
            and doubles as a way back for a viewer whose session expired. */}
        <footer className="text-center text-xs text-zinc-500 dark:text-zinc-400">
          {viewer ? (
            <Link href="/skills" className="font-medium underline underline-offset-4">
              Back to your skills
            </Link>
          ) : (
            <>
              Issued by{' '}
              <Link href="/" className="font-medium underline underline-offset-4">
                {APP_NAME}
              </Link>
            </>
          )}
        </footer>
      </main>
    </>
  );
}
