// @/lib/certificates/linkedin.ts
// The two LinkedIn hand-offs, as URLs.
//
// Both are plain links — no SDK, no OAuth, no API key. LinkedIn reads the
// query string and opens the right dialog, pre-filled. That's the whole
// integration, which is why it's 30 lines instead of a feature.
//
// IMPORTANT: both require a certificate URL a stranger's browser can open.
// LinkedIn stores `certUrl` on the profile and fetches `url` for the preview
// card, so handing either a localhost address produces a credential pointing
// at nothing. @/lib/appUrl's `isPubliclyReachable` is what the buttons check
// before offering these at all.
//
// The parameter names come from LinkedIn's "Add to Profile" documentation.
// They have changed before; if the dialog ever opens empty, re-check them
// against the current docs rather than assuming the data is wrong.

import { APP_NAME } from '@/lib/appConfig';

export interface CertificateShare {
  /** "SQL Fundamentals" */
  title: string;
  /** "Expert" — printed on the certificate, so it belongs in the name. */
  level: string;
  /** ISO date the certificate was earned. */
  issuedAt: string;
  /** Absolute, publicly reachable URL of the certificate page. */
  url: string;
  /** The certificate's share slug, as LinkedIn's credential id. */
  certId: string;
}

/**
 * "Add to profile" — lands in the Licenses & Certifications section.
 *
 * The one worth having: it puts the credential on the student's actual
 * profile rather than in a post that scrolls away.
 *
 * `organizationName` rather than `organizationId` because an id requires a
 * real LinkedIn company page. The name renders as plain text with no logo,
 * which is the honest presentation for a hackathon project anyway.
 */
export function addToProfileUrl(certificate: CertificateShare): string {
  const issued = new Date(certificate.issuedAt);

  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    // The level is part of the credential, not a separate field LinkedIn has.
    name: `${certificate.title} — ${certificate.level}`,
    organizationName: APP_NAME,
    issueYear: String(issued.getUTCFullYear()),
    issueMonth: String(issued.getUTCMonth() + 1),
    certUrl: certificate.url,
    certId: certificate.certId,
  });

  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

/**
 * "Share to feed" — opens LinkedIn's post composer with the link attached.
 *
 * LinkedIn builds the preview card by fetching the URL itself, so this looks
 * like a bare link unless the certificate page serves Open Graph tags from a
 * public host.
 */
export function shareToFeedUrl(certificate: CertificateShare): string {
  const params = new URLSearchParams({ url: certificate.url });
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}
