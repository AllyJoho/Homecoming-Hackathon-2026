// @/components/layout/SiteHeader.tsx
// The app bar: mark, primary nav, and the account cluster.
//
// Structure follows the purchasing app's Header — sticky, brand on the left,
// account actions on the right, everything below md folding into a toggle — but
// none of its chrome: no university mark, no brand fill, no notification bell.
// It's a surface-coloured bar with a hairline, so the content below is the thing
// you look at.
//
// A client component because the active-link state reads usePathname and the
// mobile panel holds open state. The session is resolved in the layout and
// passed down, so this never does its own auth read.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAME } from '@/lib/appConfig';
import { Logo, CARD_SURFACE } from '@/components/ui';
import { SignOutButton } from '@/components/auth/SignOutButton';

// No Quizzes entry: every skill on the home screen carries its own quiz, so
// that is the only way in. /quizzes still resolves for a direct link.
const NAV = [
  { href: '/home', label: 'Home' },
  { href: '/skills', label: 'Skills' },
  { href: '/resume', label: 'Resume' },
  { href: '/careers', label: 'Career' },
  { href: '/recommendations', label: 'Job matches' },
  { href: '/applications', label: 'Applications' },
];

export interface SiteHeaderProps {
  userName: string;
}

// Inline rather than an icon package: two glyphs, both header-only. They take
// their colour from the trigger via `currentColor`, so the hover shift on the
// button carries them along without a second rule.
function UserIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`.trim()}
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function ChevronDownIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`.trim()}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SignOutIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`.trim()}
    >
      <path d="M15 17v1.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2V7" />
      <path d="M10 12h10m0 0-3-3m3 3-3 3" />
    </svg>
  );
}

const MENU_ITEM_CLASS =
  'flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm ' +
  'text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed ' +
  'disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800';

// `/` would otherwise prefix-match every route and light up permanently.
function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ userName }: SiteHeaderProps) {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);

  const linkClass = (href: string) =>
    [
      'nav-link-hover text-sm transition-colors',
      isActive(pathname, href)
        ? 'nav-link-active font-medium text-zinc-900 dark:text-zinc-50'
        : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50',
    ].join(' ');

  return (
    // `supports-[backdrop-filter]` keeps the bar opaque where blur isn't
    // available, rather than leaving content showing through a flat 80% white.
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-surface-border dark:bg-surface/80 dark:supports-[backdrop-filter]:bg-surface/60">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-6">
        <Link href="/home" className="flex shrink-0 items-center gap-2">
          <Logo className="h-6 w-6" />
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{APP_NAME}</span>
        </Link>

        <nav aria-label="Main" className="hidden flex-1 md:block">
          <ul className="flex items-center gap-5">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                  className={linkClass(item.href)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Hover-driven, and CSS-only on purpose: `group-focus-within` opens the
            same panel from the keyboard, which React state would have to
            re-implement (and then race against the pointer leaving). The panel
            is `invisible` while closed, so its contents stay out of the tab
            order until the trigger is focused. */}
        <div className="group relative ml-auto hidden md:block">
          <button
            type="button"
            aria-haspopup="menu"
            className="flex cursor-pointer items-center gap-2 rounded-full px-2.5 py-1.5 text-sm text-zinc-600 transition-colors group-hover:bg-zinc-100 group-hover:text-zinc-900 group-focus-within:bg-zinc-100 group-focus-within:text-zinc-900 dark:text-zinc-400 dark:group-hover:bg-zinc-800 dark:group-hover:text-zinc-50 dark:group-focus-within:bg-zinc-800 dark:group-focus-within:text-zinc-50"
          >
            <UserIcon />
            <span className="max-w-[12rem] truncate">{userName}</span>
            <ChevronDownIcon className="h-3.5 w-3.5 transition-transform duration-150 group-hover:rotate-180 group-focus-within:rotate-180" />
          </button>

          {/* The `pt-2` lives on the wrapper, not the panel: it bridges the gap
              under the trigger so the pointer can cross into the menu without
              leaving the group and snapping it shut. */}
          <div className="invisible absolute top-full right-0 pt-2 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
            <div role="menu" className={`${CARD_SURFACE} w-48 p-1`}>
              <SignOutButton className={MENU_ITEM_CLASS} icon={<SignOutIcon />} />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation menu"
          aria-expanded={open}
          aria-controls="site-menu"
          className="ml-auto inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 md:hidden dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <span className="text-lg" aria-hidden>
            {open ? '✕' : '☰'}
          </span>
        </button>
      </div>

      {open && (
        <div
          id="site-menu"
          className="border-t border-zinc-200 px-6 py-3 md:hidden dark:border-surface-border"
        >
          <nav aria-label="Main">
            <ul className="flex flex-col gap-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                    className={`block rounded-md px-2 py-2 text-sm transition-colors ${
                      isActive(pathname, item.href)
                        ? 'bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-3 flex items-center justify-between border-t border-zinc-200 pt-3 dark:border-surface-border">
            <span className="flex min-w-0 items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <UserIcon />
              <span className="truncate">{userName}</span>
            </span>
            <SignOutButton />
          </div>
        </div>
      )}
    </header>
  );
}
