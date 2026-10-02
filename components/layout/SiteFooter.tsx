// @/components/layout/SiteFooter.tsx
// The mini footer: one hairline rule, the mark, and a copyright line.
//
// The purchasing app's Footer is a three-column block of university links,
// address and social accounts. None of that applies here, and a tall branded
// slab under a single-screen app reads as filler — so this keeps only the two
// things a footer is actually for: saying what the site is, and closing the
// page off. One row on desktop, stacked on mobile.
//
// A server component: nothing here is interactive.

import Link from 'next/link';
import { APP_NAME } from '@/lib/appConfig';
import { Logo } from '@/components/ui';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/careers', label: 'Career' },
  { href: '/recommendations', label: 'Job matches' },
];

export function SiteFooter() {
  // Evaluated per render on the server, so it can't go stale the way a
  // build-time constant would.
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-200 dark:border-surface-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-6 py-6 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <Logo className="h-5 w-5" />
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{APP_NAME}</span>
          <span className="text-sm text-zinc-400 dark:text-zinc-600">·</span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Built by Rubber Duck</span>
        </div>

        <nav aria-label="Footer">
          <ul className="flex items-center gap-4">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="text-xs text-zinc-400 dark:text-zinc-600">© {year} Rubber Duck</p>
      </div>
    </footer>
  );
}
