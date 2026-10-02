// @/lib/ai/log.ts
// One line per AI call, on the server console.
//
// The point is that "when is this app talking to a model" is answerable by
// watching the dev server instead of reading code. Every call goes through
// @/lib/ai/provider, so this log is complete by construction — if a feature
// hits a model and nothing shows up here, it bypassed the provider and that's
// the bug.
//
// Totals accumulate per process so a dev session can be summed up at any time
// (see aiCallTotals). Not persisted — this is a dev instrument, not telemetry.

import { estimateCostUsd, type AiProviderId, type AiTaskId } from '@/lib/ai/tasks';

export interface AiCallRecord {
  task: AiTaskId;
  provider: AiProviderId;
  model: string;
  ms: number;
  inputTokens?: number;
  outputTokens?: number;
  ok: boolean;
  error?: string;
}

const totals = {
  calls: 0,
  failures: 0,
  inputTokens: 0,
  outputTokens: 0,
  costUsd: 0,
  ms: 0,
};

/** A snapshot of everything this process has spent. */
export function aiCallTotals(): Readonly<typeof totals> {
  return { ...totals };
}

export function logAiCall(record: AiCallRecord): void {
  const cost = record.ok
    ? estimateCostUsd(record.model, record.inputTokens, record.outputTokens)
    : 0;

  totals.calls += 1;
  totals.ms += record.ms;
  totals.inputTokens += record.inputTokens ?? 0;
  totals.outputTokens += record.outputTokens ?? 0;
  totals.costUsd += cost;
  if (!record.ok) totals.failures += 1;

  const tokens =
    record.inputTokens === undefined && record.outputTokens === undefined
      ? 'tokens n/a'
      : `in ${record.inputTokens ?? '?'} out ${record.outputTokens ?? '?'}`;

  // Local models are free, so printing $0.0000 for them is just noise — the
  // running total is what matters there, and it's the API one you're watching.
  const money = record.provider === 'ollama' ? 'free' : `$${cost.toFixed(4)}`;

  const head = `[ai] ${record.task} · ${record.provider}/${record.model}`;
  const body = `${record.ms}ms · ${tokens} · ${money}`;

  if (record.ok) {
    console.log(
      `${head} · ${body} · session $${totals.costUsd.toFixed(4)} over ${totals.calls} call${totals.calls === 1 ? '' : 's'}`,
    );
  } else {
    console.error(`${head} · ${body} · FAILED: ${record.error}`);
  }
}
