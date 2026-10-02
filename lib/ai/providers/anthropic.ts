// @/lib/ai/providers/anthropic.ts
// The Anthropic backend. Schema-shaped calls go through `messages.parse` with
// structured outputs, which is the API doing the constraining — we never
// hand-parse model prose.

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { ZodType } from 'zod';

import type { AiTaskSpec } from '@/lib/ai/tasks';
import { anthropic } from '@/lib/ai/client';
import type { AiBackend, AiReadiness, AiResult } from './types';

/** Typed SDK errors, most specific first — a rate limit is retryable, a bad key isn't. */
function describe(error: unknown): string | null {
  if (error instanceof Anthropic.AuthenticationError) return 'ANTHROPIC_API_KEY was rejected.';
  if (error instanceof Anthropic.RateLimitError) {
    return 'Rate limited by the API — wait a moment and retry.';
  }
  if (error instanceof Anthropic.APIError) {
    return `Claude API error ${error.status}: ${error.message}`;
  }
  return null;
}

export class AnthropicCallError extends Error {}

function rethrow(error: unknown): never {
  const message = describe(error);
  if (message) throw new AnthropicCallError(message);
  throw error;
}

export const anthropicBackend: AiBackend = {
  id: 'anthropic',

  readiness(): AiReadiness {
    return process.env.ANTHROPIC_API_KEY
      ? { ok: true }
      : { ok: false, reason: 'ANTHROPIC_API_KEY is not set — add it to .env' };
  },

  async text(spec: AiTaskSpec, system, prompt): Promise<AiResult<string>> {
    const model = spec.models.anthropic;
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: spec.maxOutputTokens,
        system,
        messages: [{ role: 'user', content: prompt }],
      });

      // content is a discriminated union — narrow before reading .text.
      const value = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n\n');

      return {
        value,
        model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
    } catch (error) {
      rethrow(error);
    }
  },

  async object<T>(
    spec: AiTaskSpec,
    system: string,
    prompt: string,
    schema: ZodType<T>,
  ): Promise<AiResult<T | null>> {
    const model = spec.models.anthropic;
    try {
      const response = await anthropic.messages.parse({
        model,
        max_tokens: spec.maxOutputTokens,
        system,
        output_config: { format: zodOutputFormat(schema) },
        messages: [{ role: 'user', content: prompt }],
      });

      return {
        // null when the model couldn't fill the schema — the caller decides.
        value: (response.parsed_output as T | null) ?? null,
        model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
    } catch (error) {
      rethrow(error);
    }
  },
};
