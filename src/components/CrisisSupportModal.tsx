import React from 'react';
import { Phone, MessageSquare, X } from 'lucide-react';
import { CRISIS_CONTACTS } from '../lib/crisis';

interface CrisisSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 작성/전송을 계속 진행할 때. 없으면 닫기 버튼만 보여준다 */
  onContinue?: () => void;
  continueLabel?: string;
}

/**
 * 위기 신호가 감지됐을 때 뜨는 안내.
 *
 * 원칙 두 가지:
 *  1) 글쓰기나 대화를 막지 않는다. 막으면 다른 앱으로 옮겨갈 뿐이다.
 *  2) 번호는 하드코딩한다. 네트워크가 끊겨도 떠야 한다.
 */
export const CrisisSupportModal: React.FC<CrisisSupportModalProps> = ({
  isOpen,
  onClose,
  onContinue,
  continueLabel = '계속 작성하기',
}) => {
  if (!isOpen) return null;

  const { primary, secondary, youth } = CRISIS_CONTACTS;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4 text-center">
          <h2 className="text-lg font-bold text-[#1C1C1C] mb-2 leading-snug">
            많이 힘드셨겠어요
          </h2>
          <p className="text-sm text-[#5f5e5e] leading-relaxed">
            지금 마음이 많이 무거우시다면, 혼자 견디지 않으셔도 됩니다.
            24시간 언제든 익명으로 이야기할 수 있는 곳이 있어요.
          </p>
        </div>

        <div className="px-6 pb-2 flex flex-col gap-2">
          <a
            href={`tel:${primary.number}`}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#FF6B5A] text-white font-bold hover:bg-[#e85a4a] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {primary.label}
            </span>
            <span className="font-mono text-lg">{primary.number}</span>
          </a>

          <a
            href={`sms:${primary.number}`}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#f3f4f5] text-[#1C1C1C] text-sm font-bold hover:bg-[#e8eaec] transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            문자로 상담하기
          </a>

          <div className="flex gap-2">
            <a
              href={`tel:${secondary.number}`}
              className="flex-1 text-center px-3 py-2 rounded-lg bg-[#f3f4f5] hover:bg-[#e8eaec] transition-colors"
            >
              <span className="block text-[11px] text-[#5f5e5e]">{secondary.label}</span>
              <span className="block font-mono text-xs font-bold text-[#1C1C1C]">{secondary.number}</span>
            </a>
            <a
              href={`tel:${youth.number}`}
              className="flex-1 text-center px-3 py-2 rounded-lg bg-[#f3f4f5] hover:bg-[#e8eaec] transition-colors"
            >
              <span className="block text-[11px] text-[#5f5e5e]">{youth.label}</span>
              <span className="block font-mono text-xs font-bold text-[#1C1C1C]">{youth.number}</span>
            </a>
          </div>
        </div>

        <p className="px-6 pt-3 pb-4 text-[11px] text-[#5f5e5e]/80 text-center leading-relaxed">
          니편내편은 상담 서비스가 아닙니다. 전문가의 도움이 더 안전해요.
        </p>

        <div className="border-t border-[#E5E7EB] p-3 flex flex-col gap-1">
          {onContinue && (
            <button
              onClick={onContinue}
              className="w-full py-2.5 text-sm font-bold text-[#1C1C1C] rounded-xl hover:bg-[#f3f4f5] transition-colors cursor-pointer"
            >
              {continueLabel}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full py-2 text-xs text-[#5f5e5e] rounded-xl hover:bg-[#f3f4f5] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5 inline mr-1" />
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
