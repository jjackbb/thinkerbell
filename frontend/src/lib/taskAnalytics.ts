import { captureGA4EventContext, isCurrentGA4EventContext } from './ga4EventContext';
import { track } from './events';
import { currentAnalyticsScreen } from './analyticsSurface';
import { ANALYTICS_OPERATIONS } from './analyticsOperations';
export type BlockReason = 'auth_required' | 'validation' | 'busy' | 'limit' | 'not_ready' | 'unchanged';
/** Capture consent at start; later consent must not retroactively send a result. */
export function beginTask(operation: string) {
  const screen = currentAnalyticsScreen();
  const ga4Context = captureGA4EventContext();
  const eligible = ga4Context.eligible && !!screen && ANALYTICS_OPERATIONS.has(operation);
  let settled = false;
  if (eligible) track('operation_start', { operation, screen }, ga4Context);
  return {
    ga4Context,
    finish(outcome: 'success' | 'error' | 'cancelled') {
      if (settled) return;
      settled = true;
      if (!eligible || !isCurrentGA4EventContext(ga4Context)) return;
      // Existing AI save-result events already report the real persistence outcome.
      track(outcome === 'cancelled' ? 'operation_cancelled' : outcome === 'success' ? 'operation_success' : 'operation_error', {
        operation, screen, ...(outcome === 'error' ? { error_code: 'unconfirmed' } : {}),
      }, ga4Context);
    },
  };
}
export function blockedAction(operation: string, reason: BlockReason) {
  const screen = currentAnalyticsScreen();
  if (screen && ANALYTICS_OPERATIONS.has(operation)) track('action_blocked', { operation, reason, screen });
}

export async function measuredTask<T>(operation: string, task: () => Promise<T>): Promise<T> {
  const attempt = beginTask(operation);
  try {
    const value = await task();
    attempt.finish('success');
    return value;
  } catch (error) {
    attempt.finish('error');
    throw error;
  }
}
