// @/app/(main)/layout.tsx
// Nav + session guard for every signed-in page.
//
// The guard lives here rather than in each page: `requireSessionUser` redirects
// to /login, and a layout runs before the pages it wraps, so no page under
// (main) can render without a session.

import Link from 'next/link';
import { requireSessionUser } from '@/lib/auth/session';
import { APP_NAME } from '@/lib/appConfig';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/quizzes', label: 'Quizzes' },
  { href: '/recommendations', label: 'Job matches' },
];

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSessionUser();

  return (
    <>
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="mx-auto flex h-14 w-full max-w-4xl items-center gap-6 px-6">
          <Link href="/" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {APP_NAME}
          </Link>
          <ul className="flex flex-1 items-center gap-4">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">{user.name}</span>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">{children}</main>
    </>
  );
}
