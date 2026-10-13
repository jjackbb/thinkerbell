import { aiRetentionEnabled } from './aiRetention.js';
import type { Express, Request, Response } from 'express';

export const notificationsRepliesEnabled = () => process.env.NOTIFICATIONS_REPLIES_ENABLED === 'true';
export const COMMENT_ID = /^comment-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class NotificationInputError extends Error {}

export function isExistingCommentId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 100 && value.trim() === value && !/[\u0000-\u001f]/.test(value);
}

export function readReplyTarget(body: unknown): string | null {
  const input = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  // All routing/ownership data is computed by the server, never the browser.
  if (['replyRootId', 'recipientId', 'recipient_id', 'authorId', 'deletedAt'].some(key => key in input)) {
    throw new NotificationInputError('INVALID_COMMENT_TARGET');
  }
  if (input.replyToId === undefined || input.replyToId === null) return null;
  if (typeof input.replyToId !== 'string' || !isExistingCommentId(input.replyToId)) {
    throw new NotificationInputError('INVALID_COMMENT_TARGET');
  }
  return input.replyToId;
}
export function sameCommentRequest(row: Record<string, unknown>, userId: string, storyId: string, replyToId: string | null): boolean {
  return row.authorId === userId && row.storyId === storyId && (row.replyToId ?? null) === replyToId && !row.deletedAt;
}

/** Same explicit public projection as read_visible_comments; never return service rows. */
export function projectComment(row: Record<string, any>) {
  return {
    id: row.id, storyId: row.storyId, authorId: row.authorId, anonymousId: row.deletedAt ? '삭제된 댓글' : row.anonymousId,
    content: row.deletedAt ? '' : row.content, createdAt: row.createdAt,
    likeCount: row.deletedAt ? 0 : row.likeCount, isBlind: row.isBlind,
    authorVoted: row.deletedAt ? null : row.authorVoted, isEdited: row.isEdited,
    replyRootId: row.replyRootId ?? null, replyToId: row.replyToId ?? null, deletedAt: row.deletedAt ?? null,
  };
}

export function readNotificationPage(query: Record<string, unknown>) {
  const limitText = query.limit ?? '20';
  if (typeof limitText !== 'string' || !/^\d{1,2}$/.test(limitText) || Number(limitText) < 1 || Number(limitText) > 50) {
    throw new NotificationInputError('INVALID_NOTIFICATION_PAGE');
  }
  let cursor: { createdAt: string; id: string } | null = null;
  if (query.cursor !== undefined) {
    if (typeof query.cursor !== 'string' || !/^[A-Za-z0-9_-]{1,256}$/.test(query.cursor)) throw new NotificationInputError('INVALID_NOTIFICATION_CURSOR');
    try {
      cursor = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8'));
      if (!cursor || typeof cursor.createdAt !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(cursor.createdAt) ||
          !Number.isFinite(Date.parse(cursor.createdAt)) || typeof cursor.id !== 'string' || !UUID.test(cursor.id)) throw new Error();
    } catch { throw new NotificationInputError('INVALID_NOTIFICATION_CURSOR'); }
  }
  return { limit: Number(limitText), cursor };
}
export function encodeNotificationCursor(row: {createdAt: string; id: string}) {
  return Buffer.from(JSON.stringify({createdAt: row.createdAt, id: row.id})).toString('base64url');
}

type RpcClient = { rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<{data: any; error: any}> };
export function registerNotificationRoutes(app: Express, deps: {
  authenticate: (req: Request) => Promise<unknown>;
  scopedClient: (req: Request) => RpcClient;
  sendError: (res: Response, error: unknown) => Response;
}) {
  const run = (fn: (req: Request, res: Response, client: RpcClient) => Promise<unknown>) => async (req: Request, res: Response) => {
    if (!notificationsRepliesEnabled()) return res.status(404).json({error: 'FEATURE_UNAVAILABLE'});
    res.setHeader('Cache-Control', 'no-store');
    try {
      await deps.authenticate(req);
      return await fn(req, res, deps.scopedClient(req));
    } catch (error) {
      if (error instanceof NotificationInputError) return res.status(400).json({error: error.message});
      return deps.sendError(res, error);
    }
  };
  app.get('/api/notifications', run(async (req, res, client) => {
    const {limit, cursor} = readNotificationPage(req.query);
    const {data, error} = await client.rpc('read_my_notifications', {
      p_limit: limit + 1, p_before_created_at: cursor?.createdAt ?? null, p_before_id: cursor?.id ?? null,
    });
    if (error || !Array.isArray(data)) return res.status(503).json({error: 'NOTIFICATIONS_UNAVAILABLE'});
    const count = await client.rpc('count_my_unread_notifications');
    if (count.error || typeof count.data !== 'number') return res.status(503).json({error: 'NOTIFICATIONS_UNAVAILABLE'});
    const notifications = data.slice(0, limit);
    return res.json({notifications, unreadCount: count.data, nextCursor: data.length > limit ? encodeNotificationCursor(notifications.at(-1)) : null});
  }));
  app.get('/api/notifications/unread-count', run(async (_req, res, client) => {
    const {data, error} = await client.rpc('count_my_unread_notifications');
    return error || typeof data !== 'number' ? res.status(503).json({error: 'NOTIFICATIONS_UNAVAILABLE'}) : res.json({unreadCount: data});
  }));
  app.get('/api/notifications/:id/target', run(async (req, res, client) => {
    if (!aiRetentionEnabled()) return res.status(404).json({error: 'FEATURE_UNAVAILABLE'});
    if (!UUID.test(req.params.id)) throw new NotificationInputError('INVALID_NOTIFICATION_ID');
    const {data, error} = await client.rpc('read_my_ai_notification_target', {p_id: req.params.id});
    return error || !data ? res.status(404).json({error: 'NOTIFICATION_TARGET_NOT_FOUND'}) : res.json({room: data});
  }));
  app.post('/api/notifications/read-all', run(async (_req, res, client) => {
    const {error} = await client.rpc('mark_my_notifications_read', {p_id: null});
    return error ? res.status(503).json({error: 'NOTIFICATIONS_UNAVAILABLE'}) : res.json({updated: true});
  }));
  app.post('/api/notifications/:id/read', run(async (req, res, client) => {
    if (!UUID.test(req.params.id)) throw new NotificationInputError('INVALID_NOTIFICATION_ID');
    const {error} = await client.rpc('mark_my_notifications_read', {p_id: req.params.id});
    // Unknown/other-owner IDs are indistinguishable, and never changed.
    return error ? res.status(503).json({error: 'NOTIFICATIONS_UNAVAILABLE'}) : res.json({updated: true});
  }));
}
