import React, { useState } from 'react';
import { X, ShieldAlert, Check } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  targetId: string | null;
  onClose: () => void;
  onSubmitReport: (targetId: string, reason: string) => void;
}

const REPORT_REASONS = [
  '욕설, 비방, 인신공격성 표현',
  '허위 사실 유포 및 명예훼손',
  '상업적 홍보 및 도배성 게시물',
  '음란, 청소년 유해 매체물',
  '개인정보 유출 및 기타 규정 위반'
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  targetId,
  onClose,
  onSubmitReport,
}) => {
  if (!isOpen || !targetId) return null;

  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitReport(targetId, selectedReason);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#fffaf0] border border-[#e8e2d0] rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
        {isSubmitted ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 bg-red-500 text-white rounded-2xl flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0a0a0a]">신고가 정상적으로 접수되었습니다.</h3>
            <p className="text-xs text-[#6a6a6a]">
              누적 5회 신고 발생 시 즉시 자동 블라인드 처리 및 관리자 검토에 들어갑니다.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#ebe6d6] pb-3">
              <h3 className="text-base font-bold text-[#0a0a0a] flex items-center gap-2 font-display">
                <ShieldAlert className="w-5 h-5 text-red-500" /> 부적절한 사연/댓글 신고하기
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-xl hover:bg-[#f5f0e0] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#6a6a6a] leading-relaxed">
              쾌적하고 안전한 익명 감정 커뮤니티를 위해 신고 사유를 정확하게 선택해 주세요.
            </p>

            <div className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={`p-3 rounded-2xl border flex items-center gap-2.5 text-xs font-semibold cursor-pointer transition-all ${
                    selectedReason === reason
                      ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]'
                      : 'bg-[#f5f0e0] border-[#e8e2d0] text-[#3a3a3a] hover:bg-[#ebe6d6]'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="accent-[#ff4d8b]"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-[#e8e2d0] text-xs font-bold text-[#6a6a6a] hover:bg-[#f5f0e0] cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                신고 제출하기
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
