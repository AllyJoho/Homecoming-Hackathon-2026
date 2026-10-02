// @/lib/appUrl.ts
// Where this app lives, as far as the outside world is concerned.
//
// Certificates are the only feature that cares. A share link, a LinkedIn
// post, and a "certUrl" on someone's LinkedIn profile all have to be an
// address a stranger's browser can reach — and during development none of
// them can be, because the app is on localhost.
//
// Rather than hardcode that, both halves are derived: the absolute URL to
// hand out, and whether that URL is actually reachable from outside this
// machine. The LinkedIn buttons use the second to explain themselves instead
// of silently producing a dead link.
//
// Client-safe: no imports, and it only reads NEXT_PUBLIC_ vars.

/** Hosts that only resolve on the machine running the app. */
const PRIVATE_HOST =
  /^(localhost|127\.|0\.0\.0\.0$|\[?::1\]?$|.*\.local$|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/i;

/**
 * The origin to build shareable links from.
 *
 * NEXT_PUBLIC_APP_URL wins so a deployed build emits its real domain even in
 * a server render, where `window` doesn't exist. Falls back to wherever the
 * browser currently is, which is right for local development and means
 * nothing has to be configured to work.
 */
export function appOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  if (typeof window !== 'undefined') return window.location.origin;

  // Server render with nothing configured — only reachable in dev.
  return 'http://localhost:3000';
}

/** An absolute URL for a path, suitable for handing to someone else. */
export function absoluteUrl(path: string): string {
  return `${appOrigin()}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Whether links we hand out would actually open for someone else.
 *
 * False on localhost and on a LAN address. The LinkedIn buttons check this:
 * posting `http://localhost:3000/certificates/…` to a public profile would
 * look like it worked and leave a dead link behind, which is worse than
 * saying up front that it can't work yet.
 */
export function isPubliclyReachable(): boolean {
  try {
    return !PRIVATE_HOST.test(new URL(appOrigin()).hostname);
  } catch {
    return false;
  }
}
