// @/lib/ai/client.ts
// The shared Anthropic SDK instance. Server-only: ANTHROPIC_API_KEY must never
// reach the browser, so nothing under components/ may import this — and in
// practice nothing outside lib/ai/providers/ should import it at all. Features
// go through @/lib/ai/provider.
//
// Model ids are NOT here. They live in @/lib/ai/tasks, per task and per
// backend, so that file is a complete inventory of what this app runs and what
// it costs. Two notes on the models named there:
//
//   claude-opus-5     thinks adaptively by default; takes output_config.effort
//   claude-haiku-4-5  REJECTS output_config.effort, and wants thinking as
//                     { type: 'enabled', budget_tokens: N } rather than
//                     { type: 'adaptive' }. Structured outputs behave the same
//                     on both, which is why the shared provider surface works.

import Anthropic from '@anthropic-ai/sdk';

const globalForAnthropic = global as unknown as { anthropic: Anthropic | undefined };

/**
 * Reused across hot reloads for the same reason the Prisma client is: dev
 * recompiles would otherwise build a new client (and a new agent pool) per
 * request. Reads ANTHROPIC_API_KEY from the environment.
 */
export const anthropic = globalForAnthropic.anthropic ?? new Anthropic();

if (process.env.NODE_ENV !== 'production') globalForAnthropic.anthropic = anthropic;
