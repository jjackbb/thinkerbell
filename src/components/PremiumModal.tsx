import React from 'react';
import { X, Crown, Sparkles } from 'lucide-react';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose }) => {
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
            <h3 className="text-lg font-black text-[#0a0a0a] mb-2">유료 구독 회원 전용</h3>
            <p className="text-sm text-[#6a6a6a] leading-relaxed font-medium">
              AI 시뮬레이션(갈등 상대방과의 1:1 디베이트)은<br/>
              <strong className="text-[#0a0a0a]">프리미엄 구독 회원</strong>만 이용 가능합니다.
            </p>
          </div>

          <div className="pt-4 space-y-2">
            <button
              onClick={onClose}
              className="w-full px-5 py-3.5 bg-[#0a0a0a] text-white font-bold rounded-xl active:scale-95 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 hover:bg-black"
            >
              구독 알아보기
            </button>
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
