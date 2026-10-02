'use client';

// @/components/experience/ResumeReviewPanel.tsx
// The "Review my resume" card on /resume: what story the entries tell, what's
// working, and which specific lines to fix.
//
// Laid out so the measured half reads first. The counts and the located
// findings — bullets with no figure, bullets that open on a duty — are
// arithmetic from @/lib/profile/resumeReview, and a student can check every
// one of them against their own text in a few seconds. The model's paragraphs
// sit below that, where they're read as the opinion they are.
//
// That ordering also means a failed model call still leaves a useful card:
// the route sends the counted findings back alongside a 502, and this renders
// them under the error.
//
// There is deliberately no score for how employable or risky the student
// sounds. @/lib/ai/prompts (RESUME_REVIEW_SYSTEM_PROMPT) has the reasoning.

import { useState } from 'react';

import { Button, Card, GROUP_HEADING, Tag } from '@/components/ui';

interface CountedFinding {
  where: string;
  bullet: string;
  reason: string;
}

interface ReviewCounts {
  entries: number;
  bullets: number;
  withoutFigures: number;
  dutyPhrased: number;
  emptyEntries: number;
  overlongBullets: number;
}

/** Mirrors ResumeReview in @/lib/profile/resumeReview. */
interface Review {
  counts: ReviewCounts;
  counted: CountedFinding[];
  target: { title: string; percent: number } | null;
  throughLine: string;
  focus: string;
  strengths: string[];
  fixes: { where: string; problem: string; suggestion: string }[];
}

export interface ResumeReviewPanelProps {
  /** Drives the idle copy; the route re-reads the entries itself. */
  entryCount: number;
}

export function ResumeReviewPanel({ entryCount }: ResumeReviewPanelProps) {
  const [review, setReview] = useState<Review | null>(null);
  /** The counted half, kept when the model call failed but counting didn't. */
  const [partial, setPartial] = useState<Pick<Review, 'counts' | 'counted'> | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setError(null);
    setPartial(null);

    try {
      const response = await fetch('/api/resume/review', { method: 'POST' });
      const body = (await response.json().catch(() => null)) as
        | (Partial<Review> & { review?: Review; error?: string })
        | null;

      if (!response.ok || !body?.review) {
        // A 502 carries the counted findings even though the prose is missing.
        if (body?.counts && body.counted) {
          setPartial({ counts: body.counts, counted: body.counted });
        }
        throw new Error(body?.error ?? 'Could not review your resume.');
      }

      setReview(body.review);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  const counts = review?.counts ?? partial?.counts ?? null;
  const counted = review?.counted ?? partial?.counted ?? null;

  return (
    <Card
      title="Resume review"
      subtitle="Whether your entries tell one story, and which lines are pulling their weight."
      action={
        <Button
          onClick={run}
          variant="secondary"
          size="sm"
          loading={pending}
          loadingLabel="Reading…"
          disabled={entryCount === 0}
        >
          {review ? 'Review again' : 'Review my resume'}
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        {!review && !partial && !error && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {entryCount === 0
              ? 'Add an entry above, or paste a resume, and this has something to read.'
              : `Reads all ${entryCount} ${entryCount === 1 ? 'entry' : 'entries'} together and says what a recruiter would notice first.`}
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}

        {counts && <CountRow counts={counts} target={review?.target ?? null} />}

        {review && (
          <>
            <section className="flex flex-col gap-1">
              <p className={GROUP_HEADING}>What it says at a glance</p>
              <p className="text-sm leading-relaxed text-zinc-900 dark:text-zinc-50">
                {review.throughLine}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {review.focus}
              </p>
            </section>

            {review.strengths.length > 0 && (
              <section className="flex flex-col gap-1.5">
                <p className={GROUP_HEADING}>Working well</p>
                <ul className="flex flex-col gap-1">
                  {review.strengths.map((strength, i) => (
                    <li
                      key={i}
                      className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
                    >
                      {strength}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {review.fixes.length > 0 && (
              <section className="flex flex-col gap-2">
                <p className={GROUP_HEADING}>Worth changing, strongest first</p>
                <ol className="flex flex-col gap-3">
                  {review.fixes.map((fix, i) => (
                    <li key={i} className="flex flex-col gap-0.5">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {fix.where}
                      </p>
                      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        {fix.problem}
                      </p>
                      <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                        {fix.suggestion}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </>
        )}

        {counted && counted.length > 0 && (
          <section className="flex flex-col gap-2">
            <p className={GROUP_HEADING}>
              Counted, not guessed — {counted.length} line
              {counted.length === 1 ? '' : 's'} to look at
            </p>
            <ul className="flex flex-col gap-2">
              {counted.map((finding, i) => (
                <li
                  key={i}
                  className="flex flex-col gap-0.5 border-l-2 border-amber-300 pl-3 dark:border-amber-700"
                >
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {finding.where} — {finding.reason}
                  </p>
                  {finding.bullet && (
                    <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                      {finding.bullet}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {counted && counted.length === 0 && counts && counts.bullets > 0 && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Every bullet states a number and opens on something you did. That&rsquo;s unusual —
            nothing mechanical to fix.
          </p>
        )}
      </div>
    </Card>
  );
}

/**
 * The measured facts, as a row of figures.
 *
 * Shown above the prose on purpose: these are checkable, and a student who
 * verifies the count reads the paragraphs underneath differently.
 */
function CountRow({
  counts,
  target,
}: {
  counts: ReviewCounts;
  target: { title: string; percent: number } | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tag tone="neutral">
        {counts.entries} {counts.entries === 1 ? 'entry' : 'entries'}
      </Tag>
      <Tag tone="neutral">
        {counts.bullets} bullet{counts.bullets === 1 ? '' : 's'}
      </Tag>
      {counts.withoutFigures > 0 && (
        <Tag tone="warning">{counts.withoutFigures} with no number</Tag>
      )}
      {counts.dutyPhrased > 0 && <Tag tone="warning">{counts.dutyPhrased} duty-phrased</Tag>}
      {counts.overlongBullets > 0 && (
        <Tag tone="warning">
          {counts.overlongBullets} over-long
        </Tag>
      )}
      {target && (
        // From the deterministic career matcher, not the model — so "focus"
        // has something real behind it rather than an impression.
        <Tag tone="info">
          points at {target.title} · {target.percent}%
        </Tag>
      )}
    </div>
  );
}
