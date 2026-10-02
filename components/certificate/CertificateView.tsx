// @/components/certificate/CertificateView.tsx
// The shareable certificate itself. Deliberately self-contained and
// screenshot-friendly — the public page renders this and nothing else.
//
// There is a second implementation of this layout in ./CertificateDocument,
// for the PDF download. React-PDF can't consume Tailwind, so the two are
// separate by necessity — if you change the design here, change it there too.

import { APP_NAME } from '@/lib/appConfig';
import type { ProficiencyLevel } from '@/lib/quiz/levels';

export interface CertificateViewProps {
  holderName: string;
  title: string;
  score: number;
  level: ProficiencyLevel;
  issuedAt: string;
  /**
   * Whether to print the percentage.
   *
   * False on the public page. The share link is handed to recruiters, and a
   * credential that reads "Foundational proficiency in SQL" is worth showing
   * where the same certificate reading "Score: 56%" is not. The student still
   * sees their own score everywhere inside the app.
   */
  showScore?: boolean;
}

export function CertificateView({
  holderName,
  title,
  score,
  level,
  issuedAt,
  showScore = true,
}: CertificateViewProps) {
  return (
    <article className="mx-auto flex aspect-[4/3] w-full max-w-2xl flex-col items-center justify-center gap-4 rounded-xl border-4 border-double border-zinc-900 bg-white px-10 py-12 text-center dark:border-zinc-50 dark:bg-surface">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        Certificate of Completion
      </p>
      <p className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">{holderName}</p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">has demonstrated</p>
      {/* The level is the point of the certificate, so it outranks the title. */}
      <p className="text-2xl font-semibold uppercase tracking-wide text-zinc-900 dark:text-zinc-50">
        {level}
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">proficiency in</p>
      <p className="text-xl font-medium text-zinc-900 dark:text-zinc-50">{title}</p>
      {showScore && (
        <p className="text-sm tabular-nums text-zinc-600 dark:text-zinc-400">Score: {score}%</p>
      )}
      <footer className="mt-4 border-t border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-surface-border dark:text-zinc-400">
        {APP_NAME} ·{' '}
        {new Date(issuedAt).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </footer>
    </article>
  );
}
