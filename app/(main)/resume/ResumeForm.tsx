'use client';

// @/app/(main)/resume/ResumeForm.tsx
// Paste a resume, see what the model found, and why.
//
// The evidence line under each skill is the whole design. A bare list of
// detected skills is indistinguishable from a guess, and a student can't tell
// whether to trust it; "SQL — wrote reporting queries against Postgres" is
// checkable against their own document in a second. It's also what makes a
// wrong reading obviously wrong instead of quietly wrong.
//
// Paste rather than upload on purpose: it works identically on either AI
// backend and needs no parser. Students select-all from their PDF.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button, Card, Tag, GROUP_HEADING } from '@/components/ui';
// NOT from '@/lib/profile/resume' — that module reaches the Anthropic client,
// which must never be bundled for the browser. See resumeLimits.ts.
import { MIN_RESUME_CHARS } from '@/lib/profile/resumeLimits';

interface Reading {
  skills: { slug: string; name: string; evidence: string }[];
  /** How many experience entries the same call parsed out. */
  experienceCount: number;
  summary: string;
  saved: {
    added: string[];
    upgraded: string[];
    alreadyProven: string[];
    removed: string[];
  };
}

export function ResumeForm({ quizBySkill }: { quizBySkill: Record<string, string> }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [reading, setReading] = useState<Reading | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, startTransition] = useTransition();

  const tooShort = text.trim().length < MIN_RESUME_CHARS;
  const busy = pending || refreshing;

  async function submit() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/resume', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const body = (await response.json()) as Reading & { error?: string };

      if (!response.ok) throw new Error(body.error ?? 'Could not read that resume.');

      setReading(body);
      // The profile changed, so every page that scores against it is stale.
      startTransition(() => router.refresh());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Paste your resume"
        subtitle="Plain text is fine — select all in your PDF and copy. One read gives you both a skill profile and editable experience entries."
        footer={
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={submit} disabled={busy || tooShort}>
              {busy ? 'Reading…' : reading ? 'Read it again' : 'Read my resume'}
            </Button>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {text.trim().length === 0
                ? `At least ${MIN_RESUME_CHARS} characters.`
                : tooShort
                  ? `${text.trim().length} characters — need at least ${MIN_RESUME_CHARS}.`
                  : `${text.trim().length.toLocaleString()} characters.`}
            </p>
          </div>
        }
      >
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={14}
          spellCheck={false}
          placeholder="Jane Cougar&#10;BYU — Information Systems, expected 2027&#10;&#10;Projects&#10;• Built a course-planning app in Next.js with a Postgres backend…"
          className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </Card>

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      {reading && (
        <Card
          title={`Found ${reading.skills.length} skill${reading.skills.length === 1 ? '' : 's'} and ${reading.experienceCount} experience ${reading.experienceCount === 1 ? 'entry' : 'entries'}`}
          subtitle={reading.summary || undefined}
          action={
            <Link href="/recommendations">
              <Button size="sm" variant="secondary">
                See job matches
              </Button>
            </Link>
          }
        >
          {reading.skills.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Nothing in this resume mapped onto the skills this site tracks. That can be
              correct — or the paste may have lost its formatting.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {reading.skills.map((skill) => {
                const proven = reading.saved.alreadyProven.includes(skill.slug);
                const quizId = quizBySkill[skill.slug];

                return (
                  <li key={skill.slug} className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {proven ? (
                        <Tag variant="success">{skill.name} ✓ proven</Tag>
                      ) : quizId ? (
                        <Link href={`/quizzes/${quizId}`}>
                          <Tag variant="info">{skill.name} — prove it with a quiz</Tag>
                        </Link>
                      ) : (
                        <Tag variant="neutral">{skill.name}</Tag>
                      )}
                    </div>
                    {/* The checkable part. */}
                    <p className="pl-1 text-xs text-zinc-500 dark:text-zinc-400">
                      “{skill.evidence}”
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          {(reading.saved.upgraded.length > 0 || reading.saved.removed.length > 0) && (
            <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <p className={GROUP_HEADING}>What changed on your profile</p>
              <ul className="mt-1.5 flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                {reading.saved.upgraded.length > 0 && (
                  <li>
                    {reading.saved.upgraded.length} skill
                    {reading.saved.upgraded.length === 1 ? '' : 's'} you had typed in now
                    have resume evidence behind them.
                  </li>
                )}
                {reading.saved.removed.length > 0 && (
                  <li>
                    {reading.saved.removed.length} skill
                    {reading.saved.removed.length === 1 ? '' : 's'} from an earlier reading
                    were dropped — this resume doesn’t support them.
                  </li>
                )}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
