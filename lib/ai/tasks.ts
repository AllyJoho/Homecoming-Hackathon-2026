// @/lib/ai/tasks.ts
// THE INVENTORY OF EVERY AI CALL IN THIS APP.
//
// If a feature sends anything to a model, it has an entry here. Nothing else
// in the codebase is allowed to name a model or pick a provider — the backends
// in @/lib/ai/providers read those out of this table — so this file answers
// "where are we using AI, and what does it cost" without grepping.
//
// Adding an AI feature means: add an entry here, give it an id, then call
// generateText/generateObject from @/lib/ai/provider with that id. The call is
// logged under the id, so it shows up in the console and in `npm run ai:report`
// the moment it runs.

/** Backends a task can run on. Selected globally by AI_PROVIDER. */
export type AiProviderId = 'anthropic' | 'ollama';

export type AiTaskId = 'job-ranking' | 'quiz-coaching';

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
 * Claude Opus 5 for judgment, Claude Haiku 4.5 for volume — see
 * @/lib/ai/client for why the split exists and what Haiku won't accept.
 */
const CLAUDE_JUDGMENT = 'claude-opus-5';
const CLAUDE_VOLUME = 'claude-haiku-4-5';

export const AI_TASKS: Record<AiTaskId, AiTaskSpec> = {
  'job-ranking': {
    label: 'Job ranking',
    trigger: 'Student clicks "Find my matches" on /recommendations',
    callSite: 'lib/jobs/recommend.ts → POST /api/recommendations',
    shape: 'object',
    models: { anthropic: CLAUDE_JUDGMENT, ollama: LOCAL_DEFAULT },
    // Ranking 20 listings with reasons, plus thinking headroom on Opus.
    maxOutputTokens: 16000,
    onFailure: 'RecommendationError → 502; the panel shows the message inline.',
    frequency: 'Once per button press. ~4.6k input tokens at 20 listings.',
  },

  'quiz-coaching': {
    label: 'Quiz coaching',
    trigger: 'Student clicks "Explain what I missed" on a quiz result',
    callSite: 'app/api/results/[resultId]/feedback/route.ts',
    shape: 'text',
    models: { anthropic: CLAUDE_VOLUME, ollama: LOCAL_DEFAULT },
    maxOutputTokens: 2000,
    onFailure: '502 with the API message; the Coaching card shows it in red.',
    frequency:
      'Once per graded attempt the student asks about. Scales with questions missed — ~3.8k input tokens for all 15 SQL questions.',
  },
};

/** Per-million-token prices, for the cost line in the log. Local is free. */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-5': { input: 5, output: 25 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

export function estimateCostUsd(model: string, inputTokens = 0, outputTokens = 0): number {
  const price = MODEL_PRICING[model];
  if (!price) return 0; // local models, or a model we haven't priced
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}
