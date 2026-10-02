// @/lib/pdf/text.ts
// Make a string safe for React-PDF's built-in fonts.
//
// Both generated PDFs — the certificate and the resume — use the standard
// PDF fonts (Helvetica, Times). Those carry WinAnsi encoding and nothing
// more, and React-PDF DROPS characters outside it without warning.
//
// That was a real bug, not a hypothetical: "May 2026 — August 2026" came out
// of the resume PDF as "May 2026  August 2026", with the em dash gone and its
// surrounding spaces left behind. It looked like a layout problem. The `·` in
// the same document rendered fine, because U+00B7 *is* in WinAnsi, which made
// it harder to spot.
//
// Anything a student typed can reach these documents — a name, a job title, a
// bullet pasted out of Word with smart quotes — so every such string goes
// through here.
//
// The alternative is registering a TTF with full Unicode coverage. That means
// a font binary in the repo and a slower first render, to preserve dash and
// quote *shapes* in a document that is otherwise plain black serif. Not worth
// it; if a future design needs real typography, register the font and delete
// this.

/** Characters the standard fonts can't encode, and their safe equivalents. */
const SUBSTITUTIONS: ReadonlyArray<[RegExp, string]> = [
  [/[—–]/g, '-'], // em dash, en dash
  [/[‘’‛]/g, "'"], // curly single quotes
  [/[“”‟]/g, '"'], // curly double quotes
  [/…/g, '...'], // ellipsis
  [/[•▪◦]/g, '-'], // stray bullet glyphs inside text
  [/ /g, ' '], // non-breaking space
  [/[​-‍﻿]/g, ''], // zero-width junk from pasted text
];

export function pdfSafe(text: string): string {
  return SUBSTITUTIONS.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);
}
