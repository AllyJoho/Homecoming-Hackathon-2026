'use client';

// @/components/quiz/QuestionCoach.tsx
// The "Explain what I missed" coach that sits under one question in the
// results review, and the thread it opens.
//
// It replaced a single Coaching card above the review list, which explained
// every missed question at once. Attaching the tutor to the question it is
// talking about removes the eye-matching step, and — the actual point — makes
// a follow-up possible: the thread already knows which question it is about,
// so the student can just ask.
//
// Opt-in per question rather than automatic, for the reason the old card was:
// each turn costs a model call, and a student who already understands a
// question shouldn't pay for an explanation of it.
//
// The transcript lives here, in component state, and is resent on every turn —
// @/lib/quiz/coachTurns has the shape and the reasoning. Closing the results
// page loses it, which is the right trade for scratch work: the alternative is
// a table and a retention policy for something read once.

import { useRef, useState } from 'react';

import { Button } from '@/components/ui';
import { CodeBlock } from '@/components/quiz/CodeBlock';
import {
  COACH_MAX_QUESTION_CHARS,
  canAskFollowUp,
  type CoachTurn,
} from '@/lib/quiz/coachTurns';

export interface QuestionCoachProps {
  /** QuizAttempt id — the route re-grades the stored sheet from it. */
  attemptId: string;
  questionId: string;
  /** Drives the button's wording. The route coaches either way. */
  correct: boolean;
  /**
   * The question's own code language, used for a fenced example the model
   * didn't tag. The conversation is about this question, so its language is a
   * better guess than plain text — and the example then highlights the same
   * way as the snippet directly above it.
   */
  language?: string;
}

export function QuestionCoach({
  attemptId,
  questionId,
  correct,
  language = 'text',
}: QuestionCoachProps) {
  // `[assistant, user, assistant, …]` — the route's opening turn is never here.
  const [transcript, setTranscript] = useState<CoachTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const started = transcript.length > 0;

  /**
   * Send one turn. `question` is the student's follow-up, or null for the
   * opening ask.
   *
   * On failure the transcript is left exactly as it was and the follow-up goes
   * back in the box. That's not only kinder than losing what they typed — a
   * transcript with a user turn on the end and no reply after it would fail
   * the route's alternation check on the next send.
   */
  async function send(question: string | null) {
    const sending: CoachTurn[] = question
      ? [...transcript, { role: 'user', content: question }]
      : [];

    setPending(true);
    setError(null);
    setDraft('');

    try {
      const response = await fetch(`/api/results/${attemptId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, turns: sending }),
      });

      const body = (await response.json().catch(() => null)) as {
        reply?: string;
        error?: string;
      } | null;

      if (!response.ok || !body?.reply) {
        throw new Error(body?.error ?? 'Could not get an explanation.');
      }

      setTranscript([...sending, { role: 'assistant', content: body.reply }]);
      // Scroll the new reply into view: the thread grows below the fold on a
      // long review list, and a reply the student has to go hunting for reads
      // as nothing having happened.
      requestAnimationFrame(() =>
        threadRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
      if (question) setDraft(question);
    } finally {
      setPending(false);
    }
  }

  if (!started) {
    return (
      <div className="flex flex-col gap-2">
        <div>
          <Button
            onClick={() => void send(null)}
            variant="subtle"
            size="sm"
            loading={pending}
            loadingLabel="Thinking…"
          >
            {correct ? 'Explain why this is right' : 'Explain what I missed'}
          </Button>
        </div>
        {error && <CoachError message={error} />}
      </div>
    );
  }

  const canFollowUp = canAskFollowUp(transcript);

  return (
    <div
      ref={threadRef}
      className="mt-1 flex flex-col gap-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-950 dark:bg-indigo-950/20"
    >
      {/* aria-live so a reply arriving after the button press is announced —
          the button loses focus to nothing otherwise. */}
      <div aria-live="polite" className="flex flex-col gap-3">
        {transcript.map((turn, i) =>
          turn.role === 'assistant' ? (
            <CoachProse key={i} text={turn.content} language={language} />
          ) : (
            <p
              key={i}
              className="self-end rounded-lg bg-white px-3 py-1.5 text-sm text-zinc-700 shadow-sm dark:bg-zinc-900 dark:text-zinc-300"
            >
              {turn.content}
            </p>
          ),
        )}
      </div>

      {error && <CoachError message={error} />}

      {canFollowUp ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const question = draft.trim();
            if (question && !pending) void send(question);
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={pending}
            maxLength={COACH_MAX_QUESTION_CHARS}
            placeholder="Ask a follow-up…"
            aria-label="Ask a follow-up about this question"
            className="min-w-0 flex-1 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!draft.trim()}
            loading={pending}
            loadingLabel="Thinking…"
          >
            Ask
          </Button>
        </form>
      ) : (
        // Capped because the whole thread is resent each turn — coachTurns.ts
        // has the arithmetic.
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          That&rsquo;s as far as this thread goes. Retake the quiz to dig in further.
        </p>
      )}
    </div>
  );
}

function CoachError({ message }: { message: string }) {
  return (
    <p role="alert" className="text-sm text-red-700 dark:text-red-400">
      {message}
    </p>
  );
}

/**
 * One reply, rendered with exactly the three marks the prompt permits:
 * ```fenced``` blocks as highlighted code, `backticked` spans as inline code,
 * and *asterisked* spans emphasised.
 *
 * That's the whole renderer — not a markdown subset that happens to stop
 * here. Anything else the model emits (a heading, a bullet) shows up
 * verbatim, which is the failure mode we want: visible in the demo, and no
 * silent re-interpretation of the tutor's words.
 */
function CoachProse({ text, language }: { text: string; language: string }) {
  // Fences come out first. The inline-backtick pass further down would
  // otherwise eat a fence's own ``` marks and render the example as a mess of
  // one-character code spans.
  //
  // Two capture groups, so `split` returns a repeating triple: prose, the
  // fence's language tag, the fence's body.
  const segments = text.split(/```([\w+-]*)\r?\n?([\s\S]*?)```/g);

  return (
    <div className="flex flex-col gap-2">
      {segments.map((segment, i) => {
        const slot = i % 3;

        // The language tag is read with its body, on the next index.
        if (slot === 1) return null;

        if (slot === 2) {
          return (
            <CodeBlock
              key={i}
              code={{ language: segments[i - 1] || language, source: segment }}
            />
          );
        }

        // An unterminated fence never matches the regex above, so its ``` lands
        // here and prints literally — ugly, but nothing is swallowed.
        return <CoachParagraphs key={i} text={segment} />;
      })}
    </div>
  );
}

/** The prose between fences, as blank-line separated paragraphs. */
function CoachParagraphs({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).filter((paragraph) => paragraph.trim());
  if (paragraphs.length === 0) return null;

  return (
    <>
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {withMarks(paragraph)}
        </p>
      ))}
    </>
  );
}

/**
 * Split on the two inline marks and render them.
 *
 * `split` with two capture groups emits them in a fixed triple — plain text,
 * the code group, the emphasis group — with `undefined` for whichever branch
 * didn't match, so the index modulo 3 says which is which.
 *
 * `\*{1,2}` catches `**bold**` as well as `*stress*`: the prompt asks for one
 * asterisk, but a model that doubles them should get emphasis rather than a
 * pair of stray marks around the word. An unpaired mark falls through as
 * literal text, which is the right failure — odd-looking, nothing swallowed.
 *
 * The emphasis body may not begin or end with a space (markdown's own rule),
 * which is what keeps `2 * 3 * 4` and `SELECT * FROM t` out of it — prose a
 * tutor on a coding quiz will write sooner or later. Nor with an asterisk, so
 * the closing mark of `**bold**` isn't swallowed into the word.
 */
function withMarks(text: string) {
  return text.split(/`([^`]+)`|\*{1,2}([^\s*][^*\n]*[^\s*]|[^\s*])\*{1,2}/g).map((part, i) => {
    if (part === undefined || part === '') return null;

    if (i % 3 === 1) {
      return (
        <code
          key={i}
          className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.9em] text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {part}
        </code>
      );
    }

    if (i % 3 === 2) {
      return (
        <em key={i} className="font-medium text-zinc-900 italic dark:text-zinc-100">
          {part}
        </em>
      );
    }

    return part;
  });
}
