import { supabase } from './supabase';

/**
 * AI 대화 무료 횟수.
 *
 * 예전에는 localStorage에만 있었다. 그래서 브라우저 저장소를 지우기만 하면
 * 횟수가 초기화됐다. 나중에 실제로 돈을 받을 거라면 그 숫자는 사용자 기기가
 * 아니라 서버가 들고 있어야 한다.
 *
 * 지금은 로그인한 사용자면 Supabase(`ai_chat_usage`)에서 세고, 로그인 전이거나
 * 서버가 응답하지 않으면 예전처럼 localStorage로 센다. 서버가 잠깐 죽었다고
 * 해서 쓰던 사람을 막아버리는 것보다는 낫다고 봤다.
 */

export const DAILY_AI_QUOTA = 3;

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

/** 오늘 이 사람이 쓴 무료 횟수 */
export async function fetchAiQuotaUsed(): Promise<number> {
  const userId = await currentUserId();
  if (!userId) return readLocal();

  const { count, error } = await supabase
    .from('ai_chat_usage')
    .select('id', { count: 'exact', head: true })
    .eq('userId', userId)
    .eq('usedOn', seoulToday());

  if (error) return readLocal();
  return count ?? 0;
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
