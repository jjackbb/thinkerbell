import { supabase } from './supabase';
import type { NotificationPage } from './notificationModel';
export const aiRetentionEnabled = import.meta.env.VITE_AI_RETENTION_ENABLED === 'true';
export const notificationsRepliesEnabled = import.meta.env.VITE_NOTIFICATIONS_REPLIES_ENABLED === 'true';
export async function notificationRequest<T>(accountId: string, path: string, method = 'GET', signal?: AbortSignal): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  signal?.throwIfAborted();
  if (!session || session.user.id !== accountId) throw new Error('auth_required');
  const response = await fetch(`/api/notifications${path}`, { method, signal, headers: { Authorization: `Bearer ${session.access_token}` } });
  if (!response.ok) throw new Error('notification_request_failed');
  return response.json();
}
export const fetchNotifications = (accountId: string, cursor: string | null, signal?: AbortSignal) => notificationRequest<NotificationPage>(accountId, `?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, 'GET', signal);
