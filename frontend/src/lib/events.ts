import { supabase } from './supabase';
import { hasAnalyticsConsent } from './analyticsConsent';
import { sendGA4Event } from './ga4';
import { shouldSendToGA4 } from './ga4EventPolicy';
import { safeEventProps } from './analyticsContext';

export type EventName =
  | 'app_open'
  | 'login_success'
  | 'story_view'
  | 'vote_submit'
  | 'vote_change_success'
  | 'story_publish_success'
  | 'comment_create_success'
  | 'ai_entry_click'
  | 'ai_mode_select'
  | 'ai_start_select'
  | 'ai_settings_confirm'
  | 'ai_chat_open'
  | 'ai_chat_turn1'
  | 'ai_chat_turn3'
  | 'ai_chat_finish'
  | 'ai_feedback_view'
  | 'ai_feedback_submit'
  | 'operation_success'
  | 'operation_error';

const DB_EVENT_NAMES = new Set<EventName>([
  'app_open', 'login_success', 'story_view', 'vote_submit',
  'ai_entry_click', 'ai_mode_select', 'ai_start_select',
  'ai_chat_turn1', 'ai_chat_turn3',
]);
const SESSION_KEY = 'nipyeon_session_id';
const ONCE_PREFIX = 'nipyeon_ev_once:';
let fallbackSessionId: string | null = null;

const newId = (): string => {
  try { return crypto.randomUUID(); }
  catch { return `sid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; }
};

export const currentSessionId = (): string => {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = newId();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    if (!fallbackSessionId) fallbackSessionId = newId();
    return fallbackSessionId;
  }
};

/** 선택적 행동 분석은 동의 상태에서만 기록한다. 두 전송 경로는 서로 기다리지 않는다. */
export function track(name: EventName, props: Record<string, unknown> = {}): void {
  if (!hasAnalyticsConsent()) return;

  if (shouldSendToGA4(name, props)) {
    try { sendGA4Event(name, safeEventProps(name, props)); } catch { /* 계측 실패는 제품 동작에 영향이 없다. */ }
  }

  // 운영 DB는 현재 9개 이름만 허용한다. 새 결과 이벤트는 스키마 동기화 전까지 GA4 전용이다.
  if (!DB_EVENT_NAMES.has(name)) return;
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!hasAnalyticsConsent()) return;
      await supabase.from('events').insert({
        session_id: currentSessionId(),
        user_id: data?.session?.user?.id ?? null,
        event_name: name,
        props,
      });
    } catch { /* 계측 실패는 제품 동작에 영향이 없다. */ }
  })();
}

export function trackOnce(key: string, name: EventName, props: Record<string, unknown> = {}): void {
  if (!hasAnalyticsConsent()) return;
  const storageKey = `${ONCE_PREFIX}${key}`;
  try {
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, '1');
  } catch { /* 저장소를 못 쓰면 중복 방지 없이 기록한다. */ }
  track(name, props);
}
