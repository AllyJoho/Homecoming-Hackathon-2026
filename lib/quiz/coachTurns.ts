// @/lib/quiz/coachTurns.ts
// The wire shape of a per-question coaching thread, shared by the client that
// holds it (components/quiz/QuestionCoach) and the route that validates it
// (app/api/results/[resultId]/feedback).
//
// Why the browser holds the transcript at all: a coaching thread is scratch
// work. Persisting it means a table, a migration, and a retention question,
// for something the student reads once and closes. So the client keeps it and
// resends it, and this module is what stops the two sides disagreeing about
// the shape.
//
// What that costs, stated plainly: a student can edit the transcript they send
// back, including the assistant turns. The thing that would matter — the
// question, the answer key, what they actually answered — is NOT in here. The
// route rebuilds all of it from the database and writes the opening turn
// itself, so a forged transcript can only mislead the student's own tutor
// about the conversation, never about their score or the answer key.

import { z } from 'zod';

/**
 * One turn after the route's opening message.
 *
 * No 'system' role: the system prompt is the route's, and a client-supplied
 * one would be a prompt-injection door for no benefit.
 */
export interface CoachTurn {
  role: 'assistant' | 'user';
  content: string;
}

/**
 * How many replies one thread can get, the opening explanation included.
 *
 * A cap exists because the whole transcript is resent on every turn, so an
 * unbounded thread costs quadratically in tokens. Six is enough to explain a
 * quiz question and answer the follow-ups it raises; past that the student
 * wants a different question, not more of this one.
 */
export const COACH_MAX_REPLIES = 6;

/** Longest follow-up the box accepts. Generous for a question, not a essay. */
export const COACH_MAX_QUESTION_CHARS = 1000;

/**
 * Ceiling on a reply, for validating a transcript coming back in.
 *
 * Deliberately well above the task's 800-token output cap — this is a sanity
 * bound on a replayed assistant turn, not a second opinion about length.
 */
const MAX_REPLY_CHARS = 8000;

/**
 * A transcript is `[assistant, user, assistant, user, …]` — the opening user
 * turn is the route's and is never sent over the wire. So a request's
 * transcript always has even length (it ends on the user turn being answered),
 * and an empty one means "this is the first ask".
 */
export const COACH_MAX_REQUEST_TURNS = 2 * (COACH_MAX_REPLIES - 1);

/**
 * True when the thread has room for another follow-up.
 *
 * `transcript` is what the client is holding — odd length, since it ends on
 * the reply just rendered.
 */
export function canAskFollowUp(transcript: CoachTurn[]): boolean {
  return transcript.length < COACH_MAX_REQUEST_TURNS + 1;
}

/**
 * The transcript as the route will accept it.
 *
 * The alternation check is the part that matters: both backends require turns
 * to alternate and to end on a user turn, and a request that violates it is an
 * API error rather than a bad answer. Rejecting it here turns a 500 into a
 * 400.
 */
export const coachTurnsSchema = z
  .array(
    z.object({
      role: z.enum(['assistant', 'user']),
      content: z.string().trim().min(1).max(MAX_REPLY_CHARS),
    }),
  )
  .max(COACH_MAX_REQUEST_TURNS)
  .refine(
    (turns) =>
      turns.length % 2 === 0 &&
      turns.every((turn, i) => turn.role === (i % 2 === 0 ? 'assistant' : 'user')),
    'A coaching transcript must alternate assistant, user, … and end on a user turn.',
  );
