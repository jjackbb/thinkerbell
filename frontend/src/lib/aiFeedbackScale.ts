export const AI_FEEDBACK_SCHEMA_VERSION = 2;
export const AI_FEEDBACK_CHOICES = [
  { score: 1, label: '도움 안 됨' },
  { score: 3, label: '보통' },
  { score: 5, label: '도움 됨' },
] as const;
export const AI_CHAT_RETENTION_NOTICE = 'AI 대화방은 최종 수정 시각부터 6개월이 지난 뒤 매일 한국시간 00:01 정리 작업에서 삭제됩니다. 평가를 남기는 것만으로 대화방의 보관 기간이 늘어나지는 않습니다. 답변 내용은 평가에 저장하지 않습니다.';
