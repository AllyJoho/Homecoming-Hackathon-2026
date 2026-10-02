// @/lib/ai/provider.ts
// The one door every AI call in this app goes through.
//
// Features ask for a *shape* (prose or a schema-filled object) against a task
// id from @/lib/ai/tasks; this picks the backend, runs it, and logs what it
// cost. Nothing outside lib/ai/ touches the Anthropic SDK or Ollama directly,
// which is what makes AI_PROVIDER a real switch rather than a hope — and what
// makes the task registry a complete inventory rather than a best guess.
//
// Set in .env:
//   AI_PROVIDER=ollama      → local model, free, for tuning prompts
//   AI_PROVIDER=anthropic   → Claude, costs money, what the demo runs on

import type { ZodType } from 'zod';

import { AI_TASKS, type AiProviderId, type AiTaskId } from '@/lib/ai/tasks';
import { logAiCall } from '@/lib/ai/log';
import { anthropicBackend } from '@/lib/ai/providers/anthropic';
import { ollamaBackend } from '@/lib/ai/providers/ollama';
import type { AiBackend } from '@/lib/ai/providers/types';

const BACKENDS: Record<AiProviderId, AiBackend> = {
  anthropic: anthropicBackend,
  ollama: ollamaBackend,
};

/**
 * The default backend, resolved once at module load.
 *
 * Defaults to `anthropic`, so a deploy that forgets to set AI_PROVIDER serves
 * the real thing rather than silently trying to reach a localhost daemon.
 */
export const AI_PROVIDER: AiProviderId = parseProvider(process.env.AI_PROVIDER) ?? 'anthropic';

function parseProvider(raw: string | undefined): AiProviderId | null {
  const value = raw?.trim().toLowerCase();
  // 'local' accepted as an alias because that's what people type.
  if (value === 'ollama' || value === 'local') return 'ollama';
  if (value === 'anthropic') return 'anthropic';
  return null;
}

/**
 * The backend for one task, which may differ from the global default.
 *
 * Per-task overrides exist because the right answer isn't the same for every
 * call. Quiz coaching reads fine off a local model. Skill extraction does not:
 * mistral returned 37 of the 46 skills for one listing, and a row like that
 * matches everyone — so that task is pinned to the API in .env.
 *
 * Env var name is the task id upper-snake-cased: 'quiz-coaching' →
 * AI_PROVIDER_QUIZ_COACHING.
 */
export function providerFor(task: AiTaskId): AiProviderId {
  const key = `AI_PROVIDER_${task.replace(/-/g, '_').toUpperCase()}`;
  return parseProvider(process.env[key]) ?? AI_PROVIDER;
}

/** Thrown for every AI failure, with a message already fit to show a user. */
export class AiError extends Error {}

/**
 * True when the backend for a task can serve. Routes use this to degrade
 * rather than 500. Omit the task to check the global default.
 */
export function aiReady(task?: AiTaskId): boolean {
  return aiUnavailableReason(task) === null;
}

/** Why it can't serve, or null when it can. */
export function aiUnavailableReason(task?: AiTaskId): string | null {
  const readiness = BACKENDS[task ? providerFor(task) : AI_PROVIDER].readiness();
  return readiness.ok ? null : readiness.reason;
}

/** The model serving a given task right now — for UI that wants to say so. */
export function modelFor(task: AiTaskId): string {
  return AI_TASKS[task].models[providerFor(task)];
}

interface Request {
  task: AiTaskId;
  system: string;
  prompt: string;
}

/** Prose, for tasks whose output a person reads directly. */
export async function generateText(request: Request): Promise<string> {
  return run(request, (backend, spec) => backend.text(spec, request.system, request.prompt));
}

/**
 * A schema-filled object, or null when the model couldn't produce one.
 *
 * Both backends constrain generation to the schema rather than parsing prose —
 * Anthropic via structured outputs, Ollama via JSON-Schema-constrained
 * decoding — so a null here means a genuinely unusable response, not a
 * formatting miss.
 */
export async function generateObject<T>(
  request: Request & { schema: ZodType<T> },
): Promise<T | null> {
  return run(request, (backend, spec) =>
    backend.object(spec, request.system, request.prompt, request.schema),
  );
}

/** Readiness gate, timing, logging, and error normalization in one place. */
async function run<T>(
  request: Request,
  call: (
    backend: AiBackend,
    spec: (typeof AI_TASKS)[AiTaskId],
  ) => Promise<{
    value: T;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
  }>,
): Promise<T> {
  const reason = aiUnavailableReason(request.task);
  if (reason) throw new AiError(reason);

  const provider = providerFor(request.task);
  const spec = AI_TASKS[request.task];
  const startedAt = Date.now();

  try {
    const result = await call(BACKENDS[provider], spec);

    logAiCall({
      task: request.task,
      provider,
      model: result.model,
      ms: Date.now() - startedAt,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      ok: true,
    });

    return result.value;
  } catch (error) {
    logAiCall({
      task: request.task,
      provider,
      model: spec.models[provider],
      ms: Date.now() - startedAt,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });

    // Backend errors already carry a user-facing message; anything else is a
    // bug and should keep its stack.
    if (error instanceof Error && error.name.endsWith('CallError')) {
      throw new AiError(error.message);
    }
    throw error;
  }
}
