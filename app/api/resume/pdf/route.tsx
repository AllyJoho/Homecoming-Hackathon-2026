// @/app/api/resume/pdf/route.tsx
// The signed-in student's resume, as a downloadable PDF.
//
// PRIVATE, unlike the certificate's PDF. A certificate is a credential meant
// to be handed around, so that route takes a share slug and serves anybody. A
// resume is personal data: this route takes no id at all and renders only the
// requester's own, so there is no parameter to tamper with and nothing to
// enumerate.
//
// Rendered server-side, so @react-pdf/renderer stays out of the browser
// bundle, and the response is real vector text rather than a screenshot.
// `Content-Disposition: attachment` is what makes it a one-click download
// instead of a print dialog.

import { renderToBuffer } from '@react-pdf/renderer';

import { getSessionUser, unauthorized } from '@/lib/auth/session';
import { buildProfile } from '@/lib/profile/buildProfile';
import { listExperiences } from '@/prisma/queries';
import { ResumePdfDocument } from '@/components/experience/ResumePdfDocument';

/** Safe for a Content-Disposition filename on any platform. */
function filename(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  return `${slug || 'resume'}-resume.pdf`;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const [profile, experiences] = await Promise.all([
    buildProfile(user.id),
    listExperiences(user.id),
  ]);

  if (!profile) {
    return new Response('No profile.', { status: 404 });
  }

  // A resume with no entries is a page with a name on it. Say so rather than
  // handing over an almost-empty file the student would have to open to find
  // out.
  if (experiences.length === 0) {
    return new Response('Add some experience first — there is nothing to render.', {
      status: 409,
    });
  }

  const pdf = await renderToBuffer(
    <ResumePdfDocument
      name={profile.name}
      email={user.email}
      experiences={experiences}
      skills={profile.skills}
    />,
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${filename(profile.name)}"`,
      // Never cached: the resume changes whenever the student edits an entry
      // or earns a certificate, and a stale download is worse than a slow one.
      'cache-control': 'no-store',
    },
  });
}
