import { supabase } from './supabase';

/**
 * 유저테스트 계측.
 *
 * 9/4에 30명이 앱을 처음 쓰는 5분을 본다. 옆에서 보는 관찰이 "왜 멈췄나"를 알려주고,
 * 여기서 남기는 기록이 "어디서 멈췄나"를 알려준다. 둘 다 있어야 답이 나온다.
 *
 * 원칙 세 가지:
 *
 * 1. **계측이 서비스를 막아서는 안 된다.** 기록은 전부 실패해도 조용히 넘어가고,
 *    화면은 기다리지 않는다. 로그가 없어서 테스트를 못 하는 것보다 로그 한 줄이
 *    빠지는 편이 낫다.
 * 2. **아는 이름만 남긴다.** 9개뿐이다. 죽은 버튼이나 안 쓰는 화면에 이벤트를 심으면
 *    데이터가 오염된다(`docs/userflow.md`의 원칙).
 * 3. **한 번만 셀 것은 한 번만 센다.** 퍼널은 "몇 명이 여기까지 왔나"를 세는 것이라,
 *    같은 사람이 뒤로 갔다 다시 오면서 숫자를 부풀리면 안 된다.
 */

export type EventName =
  | 'app_open'
  | 'login_success'
  | 'story_view'
  | 'vote_submit'
  | 'ai_entry_click'
  | 'ai_mode_select'
  | 'ai_start_select'
  | 'ai_chat_turn1'
  | 'ai_chat_turn3';

const SESSION_KEY = 'nipyeon_session_id';
const ONCE_PREFIX = 'nipyeon_ev_once:';

/** 저장소를 못 쓰는 브라우저(사생활 보호 모드 등)에서 쓰는 대체 id */
let fallbackSessionId: string | null = null;

const newId = (): string => {
  try {
    return crypto.randomUUID();
  } catch {
    return `sid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
};

/**
 * 방문 하나를 가리키는 id.
 *
 * 탭을 닫으면 끝나는 `sessionStorage`에 둔다. 로그인 전 진입(`app_open`)과
 * 로그인 후 행동을 잇는 유일한 끈이라, 로그인 때문에 끊기면 안 된다.
 */
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

/**
 * 이벤트 한 건을 남긴다.
 *
 * 부러 `await` 하지 않는다 — 화면이 이 요청을 기다릴 이유가 없다.
 */
export function track(name: EventName, props: Record<string, unknown> = {}): void {
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data?.session?.user?.id ?? null;

      await supabase.from('events').insert({
        session_id: currentSessionId(),
        user_id: userId,
        event_name: name,
        props,
      });
    } catch {
      /* 계측 실패가 서비스를 막지 않는다 */
    }

    /*
      GA4를 붙이면 같은 이벤트가 그쪽으로도 간다. 아직 측정 ID가 없어서
      `window.gtag`가 없는데, 그 상태로도 이 줄은 아무 일도 하지 않는다.
      나중에 `index.html`에 gtag 한 줄만 넣으면 계측 코드를 다시 손대지 않아도 된다.
    */
    try {
      const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
      if (typeof gtag === 'function') {
        gtag('event', name, { ...props, session_id: currentSessionId() });
      }
    } catch {
      /* 무시 */
    }
  })();
}

/**
 * 이 방문에서 처음일 때만 남긴다.
 *
 * `key`는 세는 단위다. 예를 들어 사연 상세는 사연마다 한 번씩 세고 싶으므로
 * `story_view:<사연id>`처럼 쓴다.
 */
export function trackOnce(key: string, name: EventName, props: Record<string, unknown> = {}): void {
  const storageKey = `${ONCE_PREFIX}${key}`;
  try {
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, '1');
  } catch {
    /* 저장소를 못 쓰면 중복을 못 막는다. 그래도 기록은 남긴다 */
  }
  track(name, props);
}
