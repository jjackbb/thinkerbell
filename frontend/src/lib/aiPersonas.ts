import { measuredTask } from './taskAnalytics';
import { supabase } from './supabase';
import type { AIPersona } from '../types';

/**
 * AI 대화방 저장소.
 *
 * 대화방은 계정에 묶인다. 예전에는 브라우저(localStorage)에만 있어서
 * 두 가지가 동시에 잘못돼 있었다.
 *
 * - 남의 것이 보였다: 같은 브라우저에서 다른 계정으로 들어가면 앞사람의
 *   대화 내용이 그대로 보였다.
 * - 내 것이 안 보였다: 같은 계정이어도 휴대폰과 PC가 서로 다른 대화방을
 *   갖고 있었고, 브라우저 저장소를 지우면 통째로 사라졌다.
 *
 * 이제 브라우저에는 아무것도 남기지 않는다. 새 대화방은 서버 API가 만든다.
 */

/** DB 컬럼과 화면에서 쓰는 모양을 맞춘다 */
const toPersona = (row: any): AIPersona => ({
  id: row.id,
  name: row.name,
  role: row.role,
  category: row.category,
  avatarIcon: row.avatarIcon,
  description: row.description,
  systemInstruction: row.systemInstruction,
  cardColor: row.cardColor,
  sampleFirstMessage: row.sampleFirstMessage,
  isPinned: row.isPinned,
  chatHistory: row.chatHistory ?? [],
  storyId: row.storyId ?? undefined,
  opening: row.opening ?? undefined,
  ratio: row.ratio ?? undefined,
  createdAt: row.createdAt,
});

/** 서버가 사연 권한과 실제 내용을 확인하고 새 대화방을 만든다. */
async function openAiRoomImpl(
  storyId: string,
  choice: { mode: 'simulation'; opening: 'apology' | 'oblivious' | 'meFirst' } |
    { mode: 'explanation'; ratio: 'High' | 'Middle' | 'Low' },
): Promise<{ persona: AIPersona; recovered: boolean; quotaMode: 'legacy' | 'server'; legacyCharged: boolean }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('AUTH_REQUIRED');
  const response = await fetch('/api/ai/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ requestId: crypto.randomUUID(), storyId, ...choice }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.room || typeof result.room.id !== 'string' ||
      (result.quotaMode !== 'legacy' && result.quotaMode !== 'server')) {
    throw new Error(typeof result.error === 'string' ? result.error : 'CHAT_ROOM_SAVE_FAILED');
  }
  return {
    persona: toPersona(result.room), recovered: result.recovered === true,
    quotaMode: result.quotaMode, legacyCharged: result.legacyCharged === true,
  };
}

export const openAiRoom: typeof openAiRoomImpl = (...args) => measuredTask('ai_room_create', () => openAiRoomImpl(...args));

/** 이 계정의 대화방 전부. 로그인 전이면 빈 배열 */
export async function fetchPersonas(): Promise<AIPersona[]> {
  const { data, error } = await supabase
    .from('ai_personas')
    .select('*')
    .order('updatedAt', { ascending: false });

  if (error || !data) return [];
  return data.map(toPersona);
}

/**
 * 대화 내용이나 설정을 덮어쓴다.
 *
 * 대화가 오가는 동안 자주 불리므로, 호출하는 쪽에서 잦은 호출을 묶어서
 * 보내야 한다 (App의 debounce 참고). 여기서는 시키는 대로 한 번 쓴다.
 */
export async function savePersona(
  personaId: string,
  patch: Pick<AIPersona, 'chatHistory'>,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('ai_personas')
    .update({ ...patch, updatedAt: new Date().toISOString() })
    .eq('id', personaId)
    .select('id')
    .maybeSingle();
  return !error && data?.id === personaId;
}

async function patchRoom(personaId: string, action: 'pin' | 'ratio', body: object): Promise<AIPersona> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('AUTH_REQUIRED');
  const response = await fetch(`/api/ai/rooms/${encodeURIComponent(personaId)}/${action}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.room) {
    throw new Error(typeof result.error === 'string' ? result.error : 'CHAT_ROOM_SAVE_FAILED');
  }
  return toPersona(result.room);
}

export function updateAiRoomPin(personaId: string, isPinned: boolean): Promise<AIPersona> {
  return measuredTask('ai_room_pin', () => patchRoom(personaId, 'pin', { isPinned }));
}

export function updateAiRoomRatio(personaId: string, ratio: 'High' | 'Middle' | 'Low'): Promise<AIPersona> {
  return measuredTask('ai_room_ratio', () => patchRoom(personaId, 'ratio', { ratio }));
}

/** 대화방을 지운다. 내가 털어놓은 이야기는 내가 지울 수 있어야 한다 */
export async function deletePersona(personaId: string): Promise<boolean> {
  const { error } = await supabase.from('ai_personas').delete().eq('id', personaId);
  return !error;
}

/**
 * 이 계정의 대화방을 전부 지운다.
 *
 * 속마음을 털어놓는 서비스라 "그동안 한 말 전부 없애기"가 한 번에 가능해야 한다.
 * 대화방을 하나씩 지우게 하면, 정작 급할 때 다 못 지운다.
 *
 * RLS가 본인 행만 지우도록 막고 있으므로 조건 없이 지워도 남의 것은 건드리지 않는다.
 * 그래도 의도를 코드에 남기려고 userId를 명시한다.
 */
export async function deleteAllPersonas(userId: string): Promise<boolean> {
  const { error } = await supabase.from('ai_personas').delete().eq('userId', userId);
  return !error;
}
