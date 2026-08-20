import React, { useState } from 'react';
import { X, ShieldAlert, Check } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  targetId: string | null;
  onClose: () => void;
  onSubmitReport: (targetId: string, reason: string) => void;
}

/**
 * 신고 사유. PRD FEAT-09가 요구하는 항목이다.
 *
 * 예전에는 "사유를 정확하게 선택해 주세요"라고 안내해 놓고 정작 고를 것이 없는
 * 자유 입력 칸 하나뿐이었다. 신고하려는 사람에게 문장을 쓰게 만들면 대부분
 * 그냥 닫는다. 누르기만 하면 되게 한다.
 */
const REASONS = [
  '욕설 · 비방',
  '음란 · 선정성',
  '광고 · 도배',
  '개인정보 노출',
  '기타',
] as const;

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  targetId,
  onClose,
  onSubmitReport,
}) => {
  // 훅은 어떤 경우에도 같은 순서로 호출되어야 하므로 조기 반환보다 위에 둔다
  const [reason, setReason] = useState<string>('');
  const [detail, setDetail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen || !targetId) return null;

  // '기타'는 무엇이 문제였는지 적어야 처리할 수 있다
  const needsDetail = reason === '기타';
  const canSubmit = Boolean(reason) && (!needsDetail || detail.trim().length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const body = detail.trim() ? `${reason}: ${detail.trim()}` : reason;
    onSubmitReport(targetId, body);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setReason('');
      setDetail('');
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white border border-[#E5E7EB] rounded-lg w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">

        {isSubmitted ? (
          <div className="text-center px-6 py-10 space-y-3">
            <div className="w-11 h-11 bg-[#A32E1D] text-white rounded-full flex items-center justify-center mx-auto">
              <Check className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="font-headline-md text-base font-bold text-[#1C1C1C]">
              신고가 접수되었습니다
            </h3>
            <p className="font-body-sm text-xs text-[#5f5e5e] leading-relaxed">
              같은 글에 신고가 <span className="font-bold text-[#1C1C1C]">5회</span> 쌓이면
              자동으로 가려지고 관리자가 확인합니다.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="px-4 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#f8f9fa]">
              <h3 className="font-headline-md text-sm font-bold text-[#1C1C1C] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#A32E1D]" aria-hidden="true" />
                신고하기
              </h3>
              <button
                type="button"
                aria-label="닫기"
                onClick={onClose}
                className="text-[#5f5e5e] hover:text-[#1C1C1C] transition-colors p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <p className="font-body-sm text-xs text-[#5f5e5e] leading-relaxed">
                어떤 점이 문제였는지 골라주세요. 신고한 사람이 누구인지는 상대에게 보이지 않습니다.
              </p>

              <fieldset className="space-y-2">
                <legend className="sr-only">신고 사유</legend>
                {REASONS.map(r => (
                  <label
                    key={r}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      reason === r
                        ? 'border-[#A32E1D] bg-[#A32E1D]/5'
                        : 'border-[#E5E7EB] hover:border-[#A32E1D]/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="accent-[#A32E1D]"
                    />
                    <span className="font-body-sm text-xs font-bold text-[#1C1C1C]">{r}</span>
                  </label>
                ))}
              </fieldset>

              <div className="space-y-1.5">
                <label htmlFor="report-detail" className="block font-body-sm text-xs text-[#5f5e5e]">
                  {needsDetail ? '어떤 점이 문제였는지 적어주세요 (필수)' : '덧붙일 말 (선택)'}
                </label>
                <textarea
                  id="report-detail"
                  value={detail}
                  onChange={e => setDetail(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full p-3 rounded-lg border border-[#E5E7EB] bg-[#f8f9fa] text-[#1C1C1C] text-xs focus:outline-none focus:border-[#A32E1D] resize-none transition-colors"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-lg border border-[#E5E7EB] text-xs font-bold text-[#5f5e5e] hover:bg-[#f3f4f5] transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex-1 px-4 py-3 rounded-lg bg-[#A32E1D] text-white text-xs font-bold shadow-md transition-colors hover:bg-[#8d2718] disabled:bg-[#E5E7EB] disabled:text-[#5f5e5e] disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
                >
                  신고 제출하기
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
