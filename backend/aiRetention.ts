/** Local opt-in only; database activation is separately guarded. */
export const aiRetentionEnabled = () => process.env.AI_RETENTION_ENABLED === 'true';
const KST_OFFSET = 9 * 60 * 60 * 1000;
/** Reference/test implementation. Runtime deadlines come from PostgreSQL, never this helper. */
export function sixCalendarMonthsSeoul(instant: string): string {
  const time = Date.parse(instant);
  if (!Number.isFinite(time)) throw new Error('INVALID_RETENTION_TIME');
  const seoul = new Date(time + KST_OFFSET);
  const year = seoul.getUTCFullYear();
  const targetMonth = seoul.getUTCMonth() + 6;
  const lastDay = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, targetMonth, Math.min(seoul.getUTCDate(), lastDay),
    seoul.getUTCHours(), seoul.getUTCMinutes(), seoul.getUTCSeconds(), seoul.getUTCMilliseconds()) - KST_OFFSET).toISOString();
}
export function retentionMetadata(room: Record<string, unknown>) {
  return {
    lastCompletedAt: room.lastCompletedAt ?? null, expiresAt: room.expiresAt ?? null,
    retentionVersion: room.retentionVersion ?? null, retentionBasis: room.retentionBasis ?? null,
  };
}
