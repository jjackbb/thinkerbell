/**
 * Whether an exact vote total is a requested notification milestone.
 * This does not decide whether to emit an event: crossings, retries and
 * deduplication require a separate, server-authoritative policy.
 * Unconnected foundation; no notifications are sent by this module.
 */
export function isStoryVoteMilestone(total: unknown): boolean {
  return typeof total === 'number'
    && Number.isSafeInteger(total)
    && total > 0
    && (total < 100 ? total % 10 === 0 : total % 100 === 0);
}
