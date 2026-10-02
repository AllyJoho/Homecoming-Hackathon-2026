// @/components/certificate/CertificateView.tsx
// The shareable certificate itself. Deliberately self-contained and
// screenshot-friendly — the public page renders this and nothing else.
//
// There is a second implementation of this layout in ./CertificateDocument,
// for the PDF download. React-PDF can't consume Tailwind, so the two are
// separate by necessity — if you change the design here, change it there too.

import { APP_NAME } from '@/lib/appConfig';
import type { ProficiencyLevel } from '@/lib/quiz/levels';

/**
 * How large to draw it.
 *
 * `compact` exists so the public homepage can show the REAL certificate at
 * hero scale instead of a hand-drawn imitation. The previous homepage visual
 * was its own markup and had drifted badly — it showed a progress bar and "18
 * of 20 test cases passed", neither of which this product has ever produced.
 * One component, two sizes, no drift.
 */
export type CertificateSize = 'full' | 'compact';

const SIZES: Record<
  CertificateSize,
  {
    frame: string;
    label: string;
    name: string;
    caption: string;
    level: string;
    title: string;
    score: string;
    footer: string;
  }
> = {
  full: {
    frame: 'gap-4 px-10 py-12',
    label: 'text-xs',
    name: 'text-3xl',
    caption: 'text-sm',
    level: 'text-2xl',
    title: 'text-xl',
    score: 'text-sm',
    footer: 'mt-4 pt-4 text-xs',
  },
  compact: {
    frame: 'gap-2 px-6 py-7',
    label: 'text-[10px]',
    name: 'text-xl',
    caption: 'text-xs',
    level: 'text-lg',
    title: 'text-base',
    score: 'text-xs',
    footer: 'mt-3 pt-3 text-[10px]',
  },
};

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
  size?: CertificateSize;
}

export function CertificateView({
  holderName,
  title,
  score,
  level,
  issuedAt,
  showScore = true,
  size = 'full',
}: CertificateViewProps) {
  const s = SIZES[size];

  return (
    <article
      className={`mx-auto flex aspect-[4/3] w-full max-w-2xl flex-col items-center justify-center rounded-xl border-4 border-double border-zinc-900 bg-white text-center dark:border-zinc-50 dark:bg-surface ${s.frame}`}
    >
      <p
        className={`font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 ${s.label}`}
      >
        Certificate of Completion
      </p>
      <p className={`font-semibold text-zinc-900 dark:text-zinc-50 ${s.name}`}>{holderName}</p>
      <p className={`text-zinc-600 dark:text-zinc-400 ${s.caption}`}>has demonstrated</p>
      {/* The level is the point of the certificate, so it outranks the title. */}
      <p
        className={`font-semibold uppercase tracking-wide text-zinc-900 dark:text-zinc-50 ${s.level}`}
      >
        {level}
      </p>
      <p className={`text-zinc-600 dark:text-zinc-400 ${s.caption}`}>proficiency in</p>
      <p className={`font-medium text-zinc-900 dark:text-zinc-50 ${s.title}`}>{title}</p>
      {showScore && (
        <p className={`tabular-nums text-zinc-600 dark:text-zinc-400 ${s.score}`}>Score: {score}%</p>
      )}
      <footer
        className={`border-t border-zinc-200 text-zinc-500 dark:border-surface-border dark:text-zinc-400 ${s.footer}`}
      >
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
