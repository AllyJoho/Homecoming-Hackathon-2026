// @/lib/ai/client.ts
// The shared Anthropic client. Server-only: ANTHROPIC_API_KEY must never reach
// the browser, so nothing under components/ may import this.

import Anthropic from '@anthropic-ai/sdk';

/**
 * Claude Opus 5 — see https://docs.claude.com/en/docs/about-claude/models.
 * Pinned in one constant so swapping models is a one-line change.
 */
export const MODEL = 'claude-opus-5';

const globalForAnthropic = global as unknown as { anthropic: Anthropic | undefined };

/**
 * Reused across hot reloads for the same reason the Prisma client is: dev
 * recompiles would otherwise build a new client (and a new agent pool) per
 * request. Reads ANTHROPIC_API_KEY from the environment.
 */
export const anthropic = globalForAnthropic.anthropic ?? new Anthropic();

if (process.env.NODE_ENV !== 'production') globalForAnthropic.anthropic = anthropic;

/** Set false when the key is missing so routes can degrade instead of 500ing. */
export const aiEnabled = Boolean(process.env.ANTHROPIC_API_KEY);
