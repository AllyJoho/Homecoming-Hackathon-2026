// @/app/(main)/layout.tsx
// Site chrome + session guard for every signed-in page.
//
// The guard lives here rather than in each page: `requireSessionUser` redirects
// to /login, and a layout runs before the pages it wraps, so no page under
// (main) can render without a session. The header takes the resolved user as a
// prop, so it never does an auth read of its own.

import { requireSessionUser } from '@/lib/auth/session';
import { pageBody } from '@/components/ui';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSessionUser();

  return (
    <>
      <SiteHeader userName={user.name} />
      <main className={`flex-1 ${pageBody('wide')}`}>{children}</main>
      <SiteFooter />
    </>
  );
}
