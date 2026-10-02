// @/lib/profile/resumeLimits.ts
// The resume paste limits, in a module the browser can import.
//
// THIS FILE EXISTS BECAUSE OF A BUG. The form needs MIN_RESUME_CHARS to tell
// the student how much more to paste, and it used to import that constant from
// @/lib/profile/resume. But that module imports @/lib/ai/provider, which
// imports the Anthropic client — so pulling in one number dragged the whole
// server-only AI stack into a 'use client' component, and the SDK threw:
//
//   "It looks like you're running in a browser-like environment. This is
//    disabled by default, as it risks exposing your secret API credentials."
//
// The key itself never actually reached the bundle (Next only inlines
// NEXT_PUBLIC_* vars, so `new Anthropic()` found nothing), but the page broke
// and the next mistake of this shape might not be so lucky.
//
// So: values that both sides need live here, with no imports of their own.
// Anything that touches a model stays in resume.ts. Keep it that way — if you
// find yourself importing resume.ts from a client component, the constant you
// want probably belongs in this file instead.

/** Shortest text worth spending a model call on. Below this it's a mis-paste. */
export const MIN_RESUME_CHARS = 200;

/**
 * Upper bound on what we send. Generous — a long student resume is ~8k
 * characters and a CV with publications runs longer. Past this it isn't a
 * resume, and the route rejects rather than silently reading half a document.
 */
export const MAX_RESUME_CHARS = 30_000;
