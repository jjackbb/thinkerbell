import React from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface AdultVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: () => void;
}

export const AdultVerificationModal: React.FC<AdultVerificationModalProps> = ({ isOpen, onClose, onVerify }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#fffaf0] border border-[#e8e2d0] rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col relative">
        <div className="px-5 py-4 border-b border-[#ebe6d6] flex items-center justify-between bg-[#faf5e8]">
          <h2 className="text-base font-bold text-[#0a0a0a] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-red-500" /> 성인 인증 필요
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#e8e2d0] text-[#0a0a0a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="font-black text-2xl font-mono">19</span>
          </div>
          
          <div>
            <h3 className="text-lg font-black text-[#0a0a0a] mb-2">연령 확인이 필요합니다</h3>
            <p className="text-sm text-[#6a6a6a] leading-relaxed font-medium">
              이 사연은 19금 콘텐츠를 포함하고 있습니다.<br/>
              계속 보시려면 성인 인증을 완료해주세요.
            </p>
          </div>

          <div className="pt-4">
            {/* 인증 시뮬레이션 버튼 */}
            <button
              onClick={() => {
                onVerify();
                onClose();
              }}
              className="w-full px-5 py-3.5 bg-[#0a0a0a] text-white font-bold rounded-xl active:scale-95 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 hover:bg-black"
            >
              간편 성인 인증하기
            </button>
            <p className="text-[10px] text-[#6a6a6a] mt-3">
              * 실제 서비스에서는 휴대폰 본인인증(PASS 등)이 연동됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
