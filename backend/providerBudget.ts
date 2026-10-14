/** Candidate only. No environment switch enables spending implicitly. */
export const MODEL = 'gemini-3.1-flash-lite';
export const MONTHLY_CAP_NANO = 4_000_000_000;
export const MAX_INPUT_TOKENS = 1_048_576;
export const MAX_OUTPUT_TOKENS = 65_536;
export type Usage = { inputTokens: number; outputTokens: number };
const integer = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000_000;
export function costNano(inputTokens: number, outputTokens: number): number {
  if (!integer(inputTokens) || !integer(outputTokens)) throw new Error('invalid_usage');
  return inputTokens * 250 + outputTokens * 1500;
}
export function reservationNano(input: number, output: number): number {
  if (!integer(input) || input < 1 || input > MAX_INPUT_TOKENS || !integer(output) || output < 1 || output > MAX_OUTPUT_TOKENS) throw new Error('invalid_bound');
  return costNano(input, output);
}
export function kstMonth(at: Date): string {
  if (!Number.isFinite(at.getTime())) throw new Error('invalid_date');
  return new Date(at.getTime() + 9 * 3600_000).toISOString().slice(0, 7) + '-01';
}
/** Strict accounting: absent fields are not presumed zero, including thinking.
 * Cached text is charged at full input rate conservatively. Tools/audio/images
 * are forbidden by adapter; any additional billed token category is rejected. */
export function parseUsage(raw: unknown): Usage {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('unknown_usage');
  const u = raw as Record<string, unknown>;
  const { promptTokenCount: input, candidatesTokenCount: candidate, thoughtsTokenCount: thought, totalTokenCount: total } = u;
  if (!integer(input) || !integer(candidate) || !integer(thought) || !integer(total) || input + candidate + thought !== total) throw new Error('unknown_usage');
  if (u.toolUsePromptTokenCount !== undefined && u.toolUsePromptTokenCount !== 0) throw new Error('unsupported_usage');
  if (u.cachedContentTokenCount !== undefined && (!integer(u.cachedContentTokenCount) || u.cachedContentTokenCount > input)) throw new Error('unknown_usage');
  for (const key of ['promptTokensDetails', 'candidatesTokensDetails', 'cacheTokensDetails']) {
    const details = u[key];
    if (details === undefined) continue;
    if (!Array.isArray(details) || details.some(d => !d || typeof d !== 'object' || d.modality !== 'TEXT' || !integer(d.tokenCount))) throw new Error('unsupported_modality');
  }
  return { inputTokens: input, outputTokens: candidate + thought };
}
export type BudgetRpc = (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
export function createProviderBudgetGuard(rpc: BudgetRpc) {
  async function call(name: string, args: Record<string, unknown>) {
    const result = await rpc(`provider_budget_${name}`, args);
    if (result.error) throw new Error('budget_store_unavailable');
    return result.data;
  }
  return {
    async reserve({ attemptId, inputUpperBound, outputUpperBound }: { attemptId: string; inputUpperBound: number; outputUpperBound: number }): Promise<{ allowed: boolean; reason: string }> {
      reservationNano(inputUpperBound, outputUpperBound);
      const result = await call('reserve', { p_attempt_id: attemptId, p_input_bound: inputUpperBound, p_output_bound: outputUpperBound });
      if (!result || typeof result !== 'object' || typeof (result as { allowed?: unknown }).allowed !== 'boolean' || typeof (result as { reason?: unknown }).reason !== 'string') throw new Error('invalid_budget_response');
      const validated = result as { allowed: boolean; reason: string };
      if (validated.allowed && validated.reason !== 'reserved') throw new Error('invalid_budget_response');
      return validated;
    },
    async markDispatched(attemptId: string): Promise<boolean> {
      const result = await call('dispatch', { p_attempt_id: attemptId });
      if (typeof result !== 'boolean') throw new Error('invalid_budget_response');
      return result;
    },
    async settle(attemptId: string, raw: unknown): Promise<void> {
      let usage: Usage;
      try { usage = parseUsage(raw); } catch (error) {
        await call('unknown', { p_attempt_id: attemptId });
        throw error;
      }
      const result = await call('settle', { p_attempt_id: attemptId, p_input_tokens: usage.inputTokens, p_output_tokens: usage.outputTokens });
      if (!result || typeof result !== 'object' || (result as { settled?: unknown }).settled !== true) throw new Error('budget_reconciliation_required');
    },
    async retainUnknown(attemptId: string): Promise<void> { await call('unknown', { p_attempt_id: attemptId }); },
    async releaseBeforeDispatch(attemptId: string): Promise<void> { await call('release', { p_attempt_id: attemptId }); },
  };
}
