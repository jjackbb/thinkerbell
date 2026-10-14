import { randomUUID } from 'node:crypto';
import { AiError, type AiMessage, type AiProvider, type AiRequest } from './contracts.js';
import { createGeminiDraft, GEMINI_MODEL } from './gemini.js';

export interface ProviderBudget {
  reserve(input: { attemptId: string; inputUpperBound: number; outputUpperBound: number }): Promise<{ allowed: boolean; reason: string }>;
  markDispatched(id: string): Promise<boolean>;
  settle(id: string, usage: unknown): Promise<void>;
  retainUnknown(id: string): Promise<void>;
  releaseBeforeDispatch(id: string): Promise<void>;
}
export function geminiSelected(env: NodeJS.ProcessEnv = process.env): boolean {
  const provider = env.AI_PROVIDER ?? 'potens';
  if (!['potens', 'gemini'].includes(provider)) throw new AiError('UNAVAILABLE');
  return provider === 'gemini';
}
export function requireGeminiReady(env: NodeJS.ProcessEnv = process.env): void {
  if (!geminiSelected(env) || env.GEMINI_RUNTIME_ENABLED !== 'true' ||
      env.GEMINI_PAID_PROJECT_VERIFIED !== 'true' || env.GEMINI_PRIVACY_READY !== 'true' ||
      env.GEMINI_BUDGET_READY !== 'true' || env.ADULT_ELIGIBILITY_READY !== 'true' ||
      !env.GEMINI_API_KEY) throw new AiError('UNAVAILABLE');
}
/** Keep only complete chronological exchanges. Persisted history remains untouched. */
export function geminiChatMessages(history: unknown[], prompt: string, system: string): AiMessage[] {
  const pairs: AiMessage[][] = [];
  let pending: string | undefined;
  for (const entry of history) {
    if (!entry || typeof entry !== 'object') { pending = undefined; continue; }
    const row = entry as Record<string, unknown>;
    if (typeof row.text !== 'string' || !row.text.trim() || row.text.length > 4000) { pending = undefined; continue; }
    if (row.sender === 'user') pending = row.text;
    else if (row.sender === 'ai' && pending !== undefined) {
      pairs.push([{ role: 'user', text: pending }, { role: 'assistant', text: row.text }]); pending = undefined;
    } else pending = undefined;
  }
  const selected = pairs.slice(-4);
  const encoder = new TextEncoder();
  const make = () => [...selected.flat(), { role: 'user' as const, text: prompt }];
  const bytes = () => encoder.encode(system).length + 64 + make().reduce((n, m) => n + encoder.encode(m.text).length + 32, 0);
  while (selected.length && bytes() > 20000) selected.shift();
  return make();
}
/** Every attempt reserves before transport; uncertain billing is never refunded. */
export function createBudgetedGemini(options: {
  userId: string; requireAdultEligibility: (id: string) => Promise<void>;
  budget: ProviderBudget; fetch: typeof fetch; env?: NodeJS.ProcessEnv;
}): AiProvider {
  const env = options.env ?? process.env;
  async function execute<T>(request: AiRequest, invoke: (provider: AiProvider) => Promise<T>): Promise<T> {
    requireGeminiReady(env);
    await options.requireAdultEligibility(options.userId);
    const attemptId = randomUUID();
    const output = { chat: 1024, story: 2048, comment: 512 }[request.task];
    if (!output) throw new AiError('INPUT_INVALID');
    // Whole-model input ceiling: UTF-8 estimates are not a guaranteed token bound.
    const reservation = await options.budget.reserve({ attemptId, inputUpperBound: 1_048_576, outputUpperBound: output });
    if (!reservation.allowed) throw new AiError('RATE_LIMIT');
    let dispatchUncertain = false;
    let usage: unknown;
    const provider = createGeminiDraft({ enabled: true, apiKey: env.GEMINI_API_KEY!, model: GEMINI_MODEL, fetch: options.fetch,
      beforeDispatch: async () => {
        dispatchUncertain = true;
        if (!await options.budget.markDispatched(attemptId)) throw new AiError('UNAVAILABLE');
      },
      onUsage: value => { usage = value; },
    });
    try {
      const result = await invoke(provider);
      // Missing/malformed usage or failed reconciliation keeps the durable hold.
      await options.budget.settle(attemptId, usage);
      return result;
    } catch (error) {
      try {
        if (dispatchUncertain) await options.budget.retainUnknown(attemptId);
        else await options.budget.releaseBeforeDispatch(attemptId);
      } catch { /* durable reservation remains held; never substitute local accounting */ }
      throw error instanceof AiError ? error : new AiError('UNAVAILABLE');
    }
  }
  return {
    generateText: request => execute(request, provider => provider.generateText(request)),
    generateStructured: (request, spec) => execute(request, provider => provider.generateStructured(request, spec)),
    streamText: (request, onText) => execute(request, provider => provider.streamText(request, onText)),
  };
}
