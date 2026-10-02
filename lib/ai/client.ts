// @/lib/ai/client.ts
// The shared Anthropic client. Server-only: ANTHROPIC_API_KEY must never reach
// the browser, so nothing under components/ may import this.

import Anthropic from '@anthropic-ai/sdk';

/**
 * Claude Opus 5 — see https://docs.claude.com/en/docs/about-claude/models.
 * The judgment calls. These run once per user action (ranking a shortlist), so
 * the per-call cost barely registers against a demo's worth of clicks.
 */
export const MODEL = 'claude-opus-5';

/**
 * Claude Haiku 4.5 — $1/$5 per MTok against Opus 5's $5/$25, for the paths
 * that run per-item instead of per-click: quiz coaching now, and skill
 * extraction over fetched listings if live job data lands.
 *
 * Two previous-generation differences matter if you reuse this elsewhere: it
 * rejects `output_config.effort`, and thinking takes `budget_tokens` rather
 * than `{ type: 'adaptive' }`. Structured outputs behave the same as on Opus,
 * so `messages.parse` + `zodOutputFormat` ports over unchanged.
 */
export const FAST_MODEL = 'claude-haiku-4-5';

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
