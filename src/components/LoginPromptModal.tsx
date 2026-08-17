import React from 'react';
import { Lock } from 'lucide-react';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToLogin: () => void;
  message?: string;
}

export const LoginPromptModal: React.FC<LoginPromptModalProps> = ({
  isOpen,
  onClose,
  onGoToLogin,
  message = '이 기능은 로그인 후 이용하실 수 있어요.'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full max-w-sm shadow-xl overflow-hidden flex flex-col p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-[#3ECF8E]/15 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-5 h-5 text-[#3ECF8E]" />
        </div>

        <h2 className="text-lg font-bold text-[#1C1C1C] mb-2">로그인이 필요합니다</h2>
        <p className="text-sm text-[#5f5e5e] leading-relaxed mb-6">{message}</p>

        <div className="flex flex-col gap-2">
          <button
            onClick={onGoToLogin}
            className="w-full px-4 py-3 bg-[#1C1C1C] text-white font-bold rounded-xl active:scale-95 transition-all cursor-pointer shadow-md hover:bg-[#333333]"
          >
            로그인 하러가기
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-white text-[#5f5e5e] font-bold rounded-xl active:scale-95 transition-all cursor-pointer hover:bg-[#f3f4f5]"
          >
            더 둘러볼게요
          </button>
        </div>
      </div>
    </div>
  );
};
