export const AI_FEEDBACK_SCHEMA_VERSION = 2;
export const AI_FEEDBACK_CHOICES = [
  { score: 1, label: '도움 안 됨' },
  { score: 3, label: '보통' },
  { score: 5, label: '도움 됨' },
] as const;
export const AI_CHAT_RETENTION_NOTICE = 'AI 대화방은 최종 수정 시각부터 6개월이 지난 뒤 매일 한국시간 00:01 정리 작업에서 삭제됩니다. 평가를 남기는 것만으로 대화방의 보관 기간이 늘어나지는 않습니다. 답변 내용은 평가에 저장하지 않습니다.';

/** Feature-off keeps the existing operating policy until the retention migration is enabled. */
export const AI_CONVERSATION_RETENTION_NOTICE = 'AI 대화방은 마지막으로 정상 저장된 AI 답변부터 6개월 동안 보관됩니다. 새 AI 답변이 정상 저장되면 보관 기한과 만료 안내가 갱신됩니다. 방 열기·고정·공감 비율 변경·평가만으로는 보관 기간이 늘어나지 않습니다. 답변 내용은 평가에 저장하지 않습니다.';
export function aiChatRetentionNotice(enabled: boolean): string {
  return enabled ? AI_CONVERSATION_RETENTION_NOTICE : AI_CHAT_RETENTION_NOTICE;
}

/** Display the server expiry in Korea time, never reconstruct it from updatedAt or the device clock. */
export function aiExpiryLabel(expiresAt: string | null | undefined): string | null {
  if (!expiresAt || !Number.isFinite(Date.parse(expiresAt))) return null;
  return `보관 기한: ${new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(expiresAt))} (한국시간)`;
}

export function aiRetentionBasisNotice(basis: string | undefined): string | null {
  if (basis === 'legacy_updated_at') return '이전 대화방은 기존 수정 시각을 기준으로 전환했으며, 전환일부터 최소 7일의 유예가 적용됩니다.';
  if (basis === 'created_at') return '아직 정상 저장된 AI 답변이 없어 대화방 생성 시각부터 보관 기한을 계산합니다.';
  return null;
}
