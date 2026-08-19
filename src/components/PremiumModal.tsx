import React from 'react';
import { X, Sparkles } from 'lucide-react';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDemoClick?: () => void;
  /** 하루에 주어지는 무료 체험 횟수 */
  dailyQuota?: number;
}

/**
 * 무료 횟수를 다 썼을 때 뜨는 안내.
 *
 * 색은 서비스 토큰(잉크 #1C1C1C · 코랄 #FF6B5A · 경계 #E5E7EB)을 그대로 쓴다.
 * 예전에는 이 모달만 크림/골드였는데, 결제를 권하는 화면이 다른 서비스처럼
 * 보이면 그 순간 신뢰가 깎인다. 파는 화면일수록 나머지와 같아 보여야 한다.
 */
export const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose, onDemoClick, dailyQuota = 3 }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white border border-[#E5E7EB] rounded-lg w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">

        <div className="px-4 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#f8f9fa]">
          <h2 className="font-headline-md text-sm font-bold text-[#1C1C1C] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF6B5A]" aria-hidden="true" />
            AI 대화 무료 체험
          </h2>
          <button
            aria-label="닫기"
            onClick={onClose}
            className="text-[#5f5e5e] hover:text-[#1C1C1C] transition-colors p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-center space-y-2">
            <h3 className="font-headline-md text-base font-bold text-[#1C1C1C]">
              오늘 몫을 다 쓰셨어요
            </h3>
            <p className="font-body-sm text-xs text-[#5f5e5e] leading-relaxed">
              다른 사람의 사연으로 여는 AI 대화는 하루 <span className="font-bold text-[#1C1C1C]">{dailyQuota}회</span>까지 무료예요.
              <br />
              내일 다시 <span className="font-bold text-[#1C1C1C]">{dailyQuota}회</span>가 충전됩니다.
            </p>
          </div>

          {/* 지금 당장 할 수 있는 것을 알려준다. 막고 끝내면 그냥 이탈한다 */}
          <div className="flex items-start gap-2.5 rounded-lg bg-[#FF6B5A]/10 border border-[#FF6B5A]/30 p-3">
            <span className="text-base leading-none mt-0.5" aria-hidden="true">💬</span>
            <p className="font-body-sm text-xs text-[#1C1C1C] leading-relaxed">
              <span className="font-bold">내가 쓴 사연</span>은 지금도 횟수 제한 없이 대화할 수 있어요.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={onClose}
              className="w-full px-5 py-3 bg-[#FF6B5A] text-[#1C1C1C] font-bold text-xs rounded-lg hover:bg-[#FF6B5A]/90 transition-colors cursor-pointer shadow-md"
            >
              구독 알아보기
            </button>
            {onDemoClick && (
              <button
                onClick={onDemoClick}
                className="w-full px-5 py-3 bg-white border border-[#E5E7EB] text-[#1C1C1C] font-bold text-xs rounded-lg hover:border-[#FF6B5A] hover:bg-[#FF6B5A]/5 transition-colors cursor-pointer"
              >
                지금 한 번 둘러보기
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full px-5 py-3 bg-transparent text-[#5f5e5e] font-bold text-xs rounded-lg hover:bg-[#f3f4f5] transition-colors cursor-pointer"
            >
              나중에 하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
