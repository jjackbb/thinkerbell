export interface InAppNotification {
  id: string;
  kind: 'story_comment' | 'comment_reply' | 'comment_like' | 'story_vote_milestone' | 'ai_room_expiring';
  storyId: string | null;
  roomId?: string | null;
  expiresAt?: string | null;
  retentionVersion?: number | null;
  commentId: string | null;
  replyRootId: string | null;
  milestone: number | null;
  createdAt: string;
  readAt: string | null;
}
export interface NotificationPage { notifications: InAppNotification[]; nextCursor: string | null; unreadCount: number }
export function notificationLabel(item: InAppNotification): string {
  switch (item.kind) {
    case 'ai_room_expiring': return 'AI 대화방의 보관 기한이 곧 끝나요';
    case 'story_comment': return '내 사연에 새 댓글이 달렸어요';
    case 'comment_reply': return '내 댓글에 새 답글이 달렸어요';
    case 'comment_like': return '내 댓글에 공감이 도착했어요';
    case 'story_vote_milestone': return `내 사연의 투표가 ${item.milestone ?? 0}표에 도달했어요`;
    default: return '새 알림이 도착했어요';
  }
}
export function mergeNotifications(current: InAppNotification[], incoming: InAppNotification[]): InAppNotification[] {
  const items = new Map(current.map(item => [item.id, item]));
  for (const item of incoming) items.set(item.id, { ...item, readAt: item.readAt ?? items.get(item.id)?.readAt ?? null });
  return [...items.values()];
}
