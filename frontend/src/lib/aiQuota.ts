import { supabase } from './supabase';

/**
 * AI 대화 무료 횟수.
 *
 * 예전에는 localStorage에만 있었다. 그래서 브라우저 저장소를 지우기만 하면
 * 횟수가 초기화됐다. 나중에 실제로 돈을 받을 거라면 그 숫자는 사용자 기기가
 * 아니라 서버가 들고 있어야 한다.
 *
 * 사용량 조회는 서버가 현재 전환 모드에 맞는 DB 기록을 센다. 조회 실패를
 * 기기 저장소의 성공 값으로 바꾸지 않는다. 아래 직접 INSERT는 자정 전환
 * 전의 기존 대화방 생성 차감에만 쓰며, 서버 예약 단계가 연결되면 제거한다.
 */

export const DAILY_AI_QUOTA = 3;

export interface AiQuotaStatus {
  mode: 'legacy' | 'server';
  quotaDay: string;
  used: number;
  limit: number;
}

/** 서버가 사용 날짜와 예약을 포함한 현재 한도를 판정한다. 실패는 허용 횟수로 바꾸지 않는다. */
export async function fetchAiQuotaStatus(): Promise<AiQuotaStatus> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('AUTH_REQUIRED');
  const response = await fetch('/api/ai/quota', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || (result.mode !== 'legacy' && result.mode !== 'server') ||
      typeof result.quotaDay !== 'string' ||
      !Number.isInteger(result.used) || result.used < 0 || result.limit !== DAILY_AI_QUOTA) {
    throw new Error(typeof result.error === 'string' ? result.error : 'AI_QUOTA_UNAVAILABLE');
  }
  return result as AiQuotaStatus;
}

const LOCAL_KEY = 'nipyeon_ai_quota';

/**
 * 하루 경계는 한국 시간 기준.
 *
 * DB의 `usedOn` 기본값도 `Asia/Seoul`이다. 두 쪽이 다른 기준을 쓰면 자정 무렵에
 * 화면 숫자와 실제 차감이 어긋난다.
 */
const seoulToday = (): string =>
  new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

const readLocal = (): number => {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
    return raw.date === seoulToday() ? Number(raw.used) || 0 : 0;
  } catch {
    return 0;
  }
};

const writeLocal = (used: number): number => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ date: seoulToday(), used }));
  } catch {
    /* 저장 못 해도 흐름은 막지 않는다 */
  }
  return used;
};

const currentUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
};

/** 오늘 이 사람이 쓴 무료 횟수. 실패하면 호출자가 새 이용을 막는다. */
export async function fetchAiQuotaUsed(): Promise<number> {
  return (await fetchAiQuotaStatus()).used;
}

/** 한 번 썼다고 기록하고, 갱신된 사용 횟수를 돌려준다 */
export async function consumeAiQuota(storyId: string): Promise<number> {
  const userId = await currentUserId();
  if (!userId) return writeLocal(readLocal() + 1);

  const { error } = await supabase
    .from('ai_chat_usage')
    .insert({ userId, storyId });

  if (error) return writeLocal(readLocal() + 1);
  return fetchAiQuotaUsed();
}
