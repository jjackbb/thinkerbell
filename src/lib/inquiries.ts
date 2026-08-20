import { supabase } from './supabase';

/**
 * 1:1 문의.
 *
 * 메일 발송 수단이 없어서 답변은 앱 안에서 오간다. 문의한 사람은 '도움말 및 문의'
 * 화면에서 자기 문의와 답변을 보고, 운영자는 '문의 관리' 화면에서 답을 단다.
 * 예전에는 문의 버튼만 있고 보내지는 곳도, 답할 방법도 없었다.
 */

export interface Inquiry {
  id: string;
  userId: string;
  category: string;
  content: string;
  status: string;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

/** 지금 로그인한 사람이 운영자인가 */
export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin');
  return !error && data === true;
}

/** 내가 보낸 문의와 그 답변 */
export async function fetchMyInquiries(): Promise<Inquiry[]> {
  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .order('createdAt', { ascending: false });
  if (error || !data) return [];
  return data as Inquiry[];
}

/** 문의를 남긴다 */
export async function submitInquiry(userId: string, content: string): Promise<boolean> {
  const { error } = await supabase
    .from('inquiries')
    .insert({ userId, category: '1:1 문의', content });
  return !error;
}

/**
 * 운영자용: 전체 문의.
 *
 * RLS가 운영자에게만 전체를 내려주므로 여기서 따로 거르지 않는다.
 * 운영자가 아니면 자기 것만 돌아온다.
 */
export async function fetchAllInquiries(): Promise<Inquiry[]> {
  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .order('createdAt', { ascending: false });
  if (error || !data) return [];
  return data as Inquiry[];
}

/** 운영자용: 답변 등록 */
export async function replyToInquiry(inquiryId: string, reply: string): Promise<boolean> {
  const { error } = await supabase
    .from('inquiries')
    .update({ reply, repliedAt: new Date().toISOString(), status: 'answered' })
    .eq('id', inquiryId);
  return !error;
}
