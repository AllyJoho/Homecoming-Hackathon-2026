// @/lib/ai/tasks.ts
// THE INVENTORY OF EVERY AI CALL IN THIS APP.
//
// If a feature sends anything to a model, it has an entry here. Nothing else
// in the codebase is allowed to name a model or pick a provider — the backends
// in @/lib/ai/providers read those out of this table — so this file answers
// "where are we using AI, and what does it cost" without grepping.
//
// Adding an AI feature means: add an entry here, give it an id, then call
// generateText/generateChat/generateObject from @/lib/ai/provider with that id. The call is
// logged under the id, so it shows up in the console and in `npm run ai:report`
// the moment it runs.

/** Backends a task can run on. Selected globally by AI_PROVIDER. */
export type AiProviderId = 'anthropic' | 'ollama';

export type AiTaskId = 'job-skill-extraction' | 'resume-extraction' | 'quiz-coaching';

/** Whether a task needs a schema-shaped answer or free prose. */
export type AiShape = 'object' | 'text';

export interface AiTaskSpec {
  /** Human name, used in logs and the report. */
  label: string;
  /** What the student did to trigger it. */
  trigger: string;
  /** The module that makes the call, and the route it sits behind. */
  callSite: string;
  shape: AiShape;
  /** Which model serves this task on each backend. */
  models: Record<AiProviderId, string>;
  /** Ceiling on generated tokens. A cap, not a target. */
  maxOutputTokens: number;
  /** What the student sees if the call fails. */
  onFailure: string;
  /** Roughly how often this runs — the thing that decides what it costs. */
  frequency: string;
}

/**
 * The local default.
 *
 * `mistral` because it's already pulled on this machine, so a fresh checkout
 * can run AI_PROVIDER=ollama with no download. `qwen2.5:7b` follows
 * instructions and fills schemas noticeably better if you're willing to pull
 * it — set OLLAMA_MODEL to override either task without touching this file.
 */
const LOCAL_DEFAULT = process.env.OLLAMA_MODEL?.trim() || 'mistral';

/**
 * Every remaining task is extraction or explanation against a known answer —
 * mechanical work, not judgment — so they all run on Haiku. The Opus ranking
 * that used to live here was replaced by arithmetic over stored skill weights
 * (@/lib/jobs/match), which is free, instant, and identical on every run.
 */
const CLAUDE_VOLUME = 'claude-haiku-4-5';

export const AI_TASKS: Record<AiTaskId, AiTaskSpec> = {
  'job-skill-extraction': {
    label: 'Job skill extraction',
    trigger:
      'Ingest only — `npm run jobs:ingest`, or "Load more listings" on /recommendations. Never on a page render.',
    callSite: 'lib/jobs/ingest.ts',
    shape: 'object',
    models: { anthropic: CLAUDE_VOLUME, ollama: LOCAL_DEFAULT },
    // One small object per listing: level, two skill arrays, maybe a salary.
    maxOutputTokens: 1000,
    onFailure: 'That listing is skipped and the run continues; the summary counts it.',
    frequency:
      'Once per listing, ONCE EVER — the result is written to JobSkill rows, so a listing is never re-extracted. ~2.2k input tokens each (the 46-skill vocabulary plus one description).',
  },

  'resume-extraction': {
    label: 'Resume reading',
    trigger: 'Student pastes a resume on /resume and presses Read my resume',
    callSite: 'lib/profile/resume.ts → POST /api/resume',
    shape: 'object',
    models: { anthropic: CLAUDE_VOLUME, ollama: LOCAL_DEFAULT },
    maxOutputTokens: 1500,
    onFailure: 'The page reports it and nothing is written to the profile.',
    frequency:
      'Once per paste. ~2-4k input tokens — the 46-skill vocabulary plus the resume.',
  },

  'quiz-coaching': {
    label: 'Quiz coaching',
    trigger:
      'Student clicks "Explain what I missed" under one question on a quiz result, and every follow-up they ask in that thread',
    callSite: 'app/api/results/[resultId]/feedback/route.ts',
    shape: 'text',
    models: { anthropic: CLAUDE_VOLUME, ollama: LOCAL_DEFAULT },
    // One reply at a time, and the prompt asks for ~120 words. A cap this
    // size exists to stop a runaway, not to shape the answer.
    maxOutputTokens: 800,
    onFailure:
      "502 with the API message; the question's coach shows it in red, keeps the thread, and puts their question back in the box to retry.",
    frequency:
      'Once per question the student opens, plus once per follow-up. ~500 input tokens for the first turn — one question with its answer key, not the whole attempt — growing by the transcript after that, since the model is stateless and the thread is resent each turn. The thread is capped at 6 replies (lib/quiz/coachTurns.ts).',
  },
};

/** Per-million-token prices, for the cost line in the log. Local is free. */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-5': { input: 5, output: 25 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};
// Opus stays in the table rather than being removed: nothing uses it today,
// but a mis-set env var naming it should still price correctly in the log.

export function estimateCostUsd(model: string, inputTokens = 0, outputTokens = 0): number {
  const price = MODEL_PRICING[model];
  if (!price) return 0; // local models, or a model we haven't priced
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}
