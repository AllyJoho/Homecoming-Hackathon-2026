// @/lib/ai/providers/types.ts
// The contract every backend implements. Deliberately narrow: two shapes of
// call (prose, schema-constrained object) and a readiness check. Anything a
// backend can do that doesn't fit both of these doesn't belong here — the
// point of the narrow surface is that swapping AI_PROVIDER can't change what
// the features are able to ask for.

import type { ZodType } from 'zod';
import type { AiProviderId, AiTaskSpec } from '@/lib/ai/tasks';

export interface AiResult<T> {
  value: T;
  /** The model that actually served it — logged, so there's no guessing. */
  model: string;
  /** Omitted when the backend doesn't report usage. */
  inputTokens?: number;
  outputTokens?: number;
}

/** Why a backend can't serve right now, phrased for the person reading it. */
export type AiReadiness = { ok: true } | { ok: false; reason: string };

export interface AiBackend {
  readonly id: AiProviderId;
  readiness(): AiReadiness;
  text(spec: AiTaskSpec, system: string, prompt: string): Promise<AiResult<string>>;
  /** Resolves `value: null` when the model couldn't fill the schema. */
  object<T>(
    spec: AiTaskSpec,
    system: string,
    prompt: string,
    schema: ZodType<T>,
  ): Promise<AiResult<T | null>>;
}
