import type { AIPersona } from '../types';
import type { InAppNotification } from './notificationModel';

/** The target endpoint enforces ownership and expiry; also reject mismatched cached warning metadata. */
export function isCurrentAiWarning(item: InAppNotification, room: Pick<AIPersona, 'id' | 'expiresAt' | 'retentionVersion'> | null | undefined): boolean {
  return item.kind === 'ai_room_expiring' && !!item.roomId && room?.id === item.roomId &&
    Number.isSafeInteger(item.retentionVersion) && item.retentionVersion === room.retentionVersion &&
    !!item.expiresAt && !!room.expiresAt && Number.isFinite(Date.parse(item.expiresAt)) &&
    Date.parse(item.expiresAt) === Date.parse(room.expiresAt);
}
