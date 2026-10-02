// @/scripts/ai-report.ts
// Prints every AI call site in the app: what triggers it, which model serves
// it under the current AI_PROVIDER, and what it costs.
//
// Run with `npm run ai:report`. The data comes from @/lib/ai/tasks, which the
// providers also read — so this can't drift from what actually runs.

import { AI_TASKS, MODEL_PRICING, type AiTaskId } from '@/lib/ai/tasks';
import { AI_PROVIDER, aiUnavailableReason, providerFor } from '@/lib/ai/provider';

const ids = Object.keys(AI_TASKS) as AiTaskId[];

console.log(`\nDefault AI provider: ${AI_PROVIDER}  (AI_PROVIDER)`);
console.log(`\n${ids.length} AI call site${ids.length === 1 ? '' : 's'} in this app:\n`);

for (const id of ids) {
  const spec = AI_TASKS[id];
  const provider = providerFor(id);
  const model = spec.models[provider];
  const price = MODEL_PRICING[model];
  const reason = aiUnavailableReason(id);
  const override = provider === AI_PROVIDER ? '' : '  ← overridden for this task';

  console.log(`  ${spec.label}  [${id}]`);
  console.log(`    runs when   ${spec.trigger}`);
  console.log(`    code        ${spec.callSite}`);
  console.log(`    output      ${spec.shape === 'object' ? 'schema-constrained JSON' : 'prose'}`);
  console.log(`    model now   ${provider}/${model}${override}`);
  console.log(
    `    status      ${reason ? `NOT READY — ${reason}` : 'ready'}`,
  );
  console.log(
    `    other       ${Object.entries(spec.models)
      .filter(([other]) => other !== provider)
      .map(([other, m]) => `${other}/${m}`)
      .join(', ')}`,
  );
  console.log(
    `    override    AI_PROVIDER_${id.replace(/-/g, '_').toUpperCase()}=anthropic|ollama`,
  );
  console.log(
    `    price       ${price ? `$${price.input}/$${price.output} per Mtok in/out` : 'free (local)'}`,
  );
  console.log(`    max output  ${spec.maxOutputTokens} tokens`);
  console.log(`    cost shape  ${spec.frequency}`);
  console.log(`    on failure  ${spec.onFailure}`);
  console.log('');
}

console.log('Watch the dev server console for a [ai] line per call at runtime.\n');
