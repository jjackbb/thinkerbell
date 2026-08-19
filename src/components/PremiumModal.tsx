import React from 'react';
import { X, Crown, Sparkles } from 'lucide-react';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDemoClick?: () => void;
  /** 하루에 주어지는 무료 체험 횟수 */
  dailyQuota?: number;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose, onDemoClick, dailyQuota = 3 }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#fffaf0] border border-[#e8e2d0] rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col relative">
        <div className="px-5 py-4 border-b border-[#ebe6d6] flex items-center justify-between bg-[#faf5e8]">
          <h2 className="text-base font-bold text-[#0a0a0a] flex items-center gap-2">
            <Crown className="w-5 h-5 text-[#ffd700]" /> 프리미엄 기능

          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#e8e2d0] text-[#0a0a0a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-[#fff9c4] text-[#fbc02d] rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
            <Sparkles className="w-8 h-8" />
          </div>
          
          <div>
            <h3 className="text-lg font-black text-[#0a0a0a] mb-2">오늘 무료 체험을 다 쓰셨어요</h3>
            <p className="text-sm text-[#6a6a6a] leading-relaxed font-medium">
              다른 사람의 사연으로 여는 AI 대화는 하루 <strong className="text-[#0a0a0a]">{dailyQuota}회</strong>까지 무료예요.<br/>
              <strong className="text-[#0a0a0a]">내일 다시 {dailyQuota}회</strong>가 충전됩니다.
            </p>
            <p className="text-xs text-[#8a8a8a] mt-3">
              내가 쓴 사연은 횟수 제한 없이 대화할 수 있어요.
            </p>
          </div>

          <div className="pt-4 space-y-2">
            <button
              onClick={onClose}
              className="w-full px-5 py-3.5 bg-[#0a0a0a] text-white font-bold rounded-xl active:scale-95 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 hover:bg-black"
            >
              구독 알아보기
            </button>
            {onDemoClick && (
              <button
                onClick={onDemoClick}
                className="w-full px-5 py-3.5 bg-transparent border border-[#e8e2d0] text-[#0a0a0a] font-bold rounded-xl active:scale-95 transition-all cursor-pointer hover:bg-[#f5f0e0]"
              >
                지금 한 번 둘러보기
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full px-5 py-3.5 bg-transparent text-[#6a6a6a] font-bold rounded-xl active:scale-95 transition-all cursor-pointer hover:bg-[#f5f0e0]"
            >
              나중에 하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
