import { aiExpiryLabel } from '../lib/aiFeedbackScale';
import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { fetchNotifications, notificationRequest } from '../lib/notifications';
import { mergeNotifications, notificationLabel, type InAppNotification, type NotificationPage } from '../lib/notificationModel';

export const NotificationList: React.FC<{ accountId: string; onOpen: (item: InAppNotification, signal?: AbortSignal) => Promise<boolean>; onUnreadChange: (count: number) => void }> = ({ accountId, onOpen, onUnreadChange }) => {
  const [page, setPage] = useState<NotificationPage>({ notifications: [], nextCursor: null, unreadCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const request = useRef<AbortController | null>(null);
  const requestedCursor = useRef<string | null>(null);
  const alive = useRef(true);
  const actionRequest = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const pageRef = useRef(page); pageRef.current = page;
  async function load(cursor: string | null = null) {
    if (busy.current) return;
    busy.current = true;
    requestedCursor.current = cursor;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError('');
    try {
      const result = await fetchNotifications(accountId, cursor, controller.signal);
      if (!alive.current || controller.signal.aborted) return;
      setPage(previous => ({ ...result, notifications: cursor ? mergeNotifications(previous.notifications, result.notifications) : result.notifications }));
      onUnreadChange(result.unreadCount);
    } catch { if (alive.current && !controller.signal.aborted) setError('알림을 불러오지 못했어요. 다시 시도해 주세요.'); }
    finally { if (alive.current && !controller.signal.aborted) { busy.current = false; setLoading(false); } }
  }
  useEffect(() => { alive.current = true; busy.current = false; void load(); return () => { alive.current = false; request.current?.abort(); actionRequest.current?.abort(); }; }, [accountId]);
  async function markRead(item?: InAppNotification) {
    if (busy.current) return;
    busy.current = true; setActionId(item?.id ?? 'all'); setNotice('');
    const controller = new AbortController(); actionRequest.current = controller;
    let refreshStaleWarning = false;
    try {
      if (!item || !item.readAt) {
        const result = await notificationRequest<{ updated: boolean }>(accountId, item ? `/${encodeURIComponent(item.id)}/read` : '/read-all', 'POST', controller.signal);
        if (result.updated !== true) throw new Error('read_not_confirmed');
        if (!alive.current) return;
        const now = new Date().toISOString();
        const unreadCount = item ? Math.max(0, pageRef.current.unreadCount - 1) : 0;
        setPage(previous => ({ ...previous, unreadCount, notifications: previous.notifications.map(n => !item || n.id === item.id ? { ...n, readAt: n.readAt ?? now } : n) }));
        onUnreadChange(unreadCount);
        // Reconcile concurrent arrivals and reads on other devices with the server total.
        try {
          const fresh = await notificationRequest<{ unreadCount: number }>(accountId, '/unread-count', 'GET', controller.signal);
          if (!alive.current || controller.signal.aborted) return;
          setPage(previous => ({ ...previous, unreadCount: fresh.unreadCount }));
          onUnreadChange(fresh.unreadCount);
        } catch { /* The read mutation succeeded; refresh can reconcile a failed count read. */ }
      }
      if (!alive.current || controller.signal.aborted) return;
      if (item) {
        const opened = await onOpen(item, controller.signal);
        if (alive.current && !opened) { refreshStaleWarning = item.kind === 'ai_room_expiring'; setNotice(item.kind === 'ai_room_expiring' ? '보관 기한이 갱신되었거나 삭제·만료된 대화방이에요. 알림을 새로 확인할게요.' : '삭제되었거나 지금 볼 수 없는 사연·댓글이에요.'); }
      } else setNotice('모든 알림을 읽음으로 표시했어요.');
    } catch { if (alive.current) { refreshStaleWarning = item?.kind === 'ai_room_expiring'; setNotice(refreshStaleWarning ? '이 만료 안내를 열 수 없어요. 알림을 새로 확인할게요.' : '처리하지 못했어요. 잠시 후 다시 시도해 주세요.'); } }
    finally { if (alive.current) { busy.current = false; setActionId(null); if (refreshStaleWarning) void load(); } }
  }
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible' && !busy.current) void load(); };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [accountId]);
  return <section className="space-y-3" aria-label="내 알림" data-analytics-exclude="true">
    <p className="text-xs text-[var(--color-secondary-grey)]">알림은 생성 후 30일 동안 보관돼요. 읽음 여부와 관계없이 기간이 지나면 삭제돼요.</p>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-[var(--color-secondary-grey)]" aria-live="polite">읽지 않은 알림 {page.unreadCount}개</p>
      <div className="flex gap-2">
        <button type="button" disabled={loading || !!actionId} onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-subtle)] px-3 py-2 text-xs disabled:opacity-50"><RefreshCw size={14} />새로고침</button>
        <button type="button" disabled={loading || !!actionId || !page.unreadCount} onClick={() => void markRead()} className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-subtle)] px-3 py-2 text-xs disabled:opacity-50"><CheckCheck size={14} />모두 읽음</button>
      </div>
    </div>
    {notice && <p role="status" className="rounded-lg bg-[var(--color-surface-container)] p-3 text-sm">{notice}</p>}
    {error && <div role="alert" className="rounded-lg border border-[var(--color-border-subtle)] p-4 text-sm">{error}<button type="button" className="ml-2 underline" disabled={loading || !!actionId} onClick={() => void load(requestedCursor.current)}>다시 시도</button></div>}
    {!loading && !error && !page.notifications.length && <div className="rounded-lg border border-dashed border-[var(--color-border-subtle)] bg-white p-10 text-center"><Bell className="mx-auto mb-3 text-[var(--color-secondary-grey)]" aria-hidden="true" /><p className="font-bold text-sm">아직 받은 알림이 없어요</p><p className="mt-2 text-xs text-[var(--color-secondary-grey)]">내 사연의 댓글·투표와 내 댓글의 답글·공감을 여기에서 확인해요.</p></div>}
    <ul className="space-y-2">{page.notifications.map(item => <li key={item.id}><button type="button" disabled={!!actionId || loading} onClick={() => void markRead(item)} className={`w-full rounded-lg border border-[var(--color-border-subtle)] p-4 text-left transition-colors hover:border-[var(--color-action-coral)] disabled:opacity-60 ${item.readAt ? 'bg-white' : 'bg-[var(--color-surface-container)]'}`}>
      <span className="flex items-start gap-2"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.readAt ? 'bg-transparent' : 'bg-[var(--color-my-side-ink)]'}`} aria-hidden="true" /><span><span className="block text-sm font-bold">{!item.readAt && <span className="sr-only">읽지 않음: </span>}{notificationLabel(item)}</span>{item.kind === 'ai_room_expiring' && aiExpiryLabel(item.expiresAt) && <span className="mt-1 block text-xs">{aiExpiryLabel(item.expiresAt)}</span>}<time dateTime={item.createdAt} className="mt-1 block text-xs text-[var(--color-secondary-grey)]">{new Date(item.createdAt).toLocaleString('ko-KR')}</time>{actionId === item.id && <span className="text-xs">여는 중…</span>}</span></span>
    </button></li>)}</ul>
    {loading && <p role="status" className="p-4 text-center text-sm">알림을 불러오는 중…</p>}
    {!loading && page.nextCursor && <button type="button" disabled={!!actionId} onClick={() => void load(page.nextCursor)} className="w-full rounded-lg border border-[var(--color-border-subtle)] p-3 text-sm">이전 알림 더 보기</button>}
  </section>;
}
