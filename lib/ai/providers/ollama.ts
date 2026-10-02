// @/lib/ai/providers/ollama.ts
// The local backend: a model served by Ollama on this machine.
//
// Why Ollama's native /api/chat rather than its OpenAI-compatible endpoint:
// the native one takes `format` as a full JSON Schema and constrains decoding
// to it. That's the local equivalent of Anthropic's structured outputs, and
// it's the only reason job ranking works here at all — without it the model
// returns prose that looks like JSON and we'd be back to hand-parsing.
//
// Schema comes from the same zod object the Anthropic path uses, via
// z.toJSONSchema, so the two backends are constrained by one definition. The
// response is still validated with zod afterwards: constrained decoding
// guarantees well-formed JSON matching the shape, not that a 7B model put
// sensible values in it.

import { z, type ZodType } from 'zod';

import type { AiTaskSpec } from '@/lib/ai/tasks';
import type { AiBackend, AiMessage, AiReadiness, AiResult } from './types';

const OLLAMA_URL = process.env.OLLAMA_URL?.replace(/\/$/, '') || 'http://localhost:11434';

/** Local generation is slow — minutes, not seconds, on a cold model. */
const TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 180_000;

export class OllamaCallError extends Error {}

interface ChatResponse {
  message?: { content?: string };
  prompt_eval_count?: number;
  eval_count?: number;
}

async function chat(
  model: string,
  system: string,
  messages: AiMessage[],
  maxOutputTokens: number,
  format?: unknown,
): Promise<{ content: string; inputTokens?: number; outputTokens?: number }> {
  let response: Response;
  try {
    response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        model,
        stream: false,
        messages: [{ role: 'system', content: system }, ...messages],
        // Deterministic by default: when you're tuning a prompt you want the
        // same input to give the same output, so a diff means your edit did it.
        options: { temperature: 0, num_predict: maxOutputTokens },
        ...(format ? { format } : {}),
      }),
    });
  } catch (error) {
    // Connection refused and timeout both land here, and both have a fix the
    // person reading the error can act on.
    const hint =
      error instanceof Error && error.name === 'TimeoutError'
        ? `timed out after ${TIMEOUT_MS / 1000}s — a bigger model or a cold start can exceed this; raise OLLAMA_TIMEOUT_MS`
        : `could not reach Ollama at ${OLLAMA_URL} — is \`ollama serve\` running?`;
    throw new OllamaCallError(`Local model (${model}) ${hint}`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    // A missing model is the overwhelmingly common 404 here.
    const hint = response.status === 404 ? ` — try \`ollama pull ${model}\`` : '';
    throw new OllamaCallError(
      `Ollama returned ${response.status} for model "${model}"${hint}${body ? `: ${body.slice(0, 200)}` : ''}`,
    );
  }

  const body = (await response.json()) as ChatResponse;
  return {
    content: body.message?.content ?? '',
    inputTokens: body.prompt_eval_count,
    outputTokens: body.eval_count,
  };
}

export const ollamaBackend: AiBackend = {
  id: 'ollama',

  // Nothing to check synchronously — Ollama needs no key, and whether the
  // daemon is up is only knowable by asking. chat() reports that per call
  // with a message naming the fix.
  readiness(): AiReadiness {
    return { ok: true };
  },

  async text(spec: AiTaskSpec, system, messages: AiMessage[]): Promise<AiResult<string>> {
    const model = spec.models.ollama;
    const { content, inputTokens, outputTokens } = await chat(
      model,
      system,
      messages,
      spec.maxOutputTokens,
    );
    return { value: content.trim(), model, inputTokens, outputTokens };
  },

  async object<T>(
    spec: AiTaskSpec,
    system: string,
    prompt: string,
    schema: ZodType<T>,
  ): Promise<AiResult<T | null>> {
    const model = spec.models.ollama;

    const { content, inputTokens, outputTokens } = await chat(
      model,
      // Small models fill a schema more reliably when the instruction to do so
      // is in the prompt as well as in the decoder constraint.
      `${system}\n\nRespond with JSON matching the required schema. No prose, no markdown fences.`,
      [{ role: 'user', content: prompt }],
      spec.maxOutputTokens,
      z.toJSONSchema(schema),
    );

    const parsed = safeParse(schema, content);
    return { value: parsed, model, inputTokens, outputTokens };
  },
};

/**
 * Parse and validate, returning null rather than throwing.
 *
 * Mirrors what the Anthropic backend reports when the model can't fill the
 * schema (`parsed_output: null`), so callers handle one failure mode instead
 * of one per backend.
 */
function safeParse<T>(schema: ZodType<T>, content: string): T | null {
  if (!content.trim()) return null;

  // Constrained decoding should make this exact, but a model that ignores the
  // constraint tends to wrap JSON in a fence — cheap to recover from.
  const unfenced = content.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');

  let json: unknown;
  try {
    json = JSON.parse(unfenced);
  } catch {
    return null;
  }

  const result = schema.safeParse(json);
  return result.success ? result.data : null;
}
