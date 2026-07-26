import React from 'react';
import { X, MessageSquare, ListTree } from 'lucide-react';

interface AIChatModeSelectionModalProps {
  onClose: () => void;
  onSelectMode: (mode: 'simulation' | 'explanation') => void;
}

export const AIChatModeSelectionModal: React.FC<AIChatModeSelectionModalProps> = ({
  onClose,
  onSelectMode,
}) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white rounded-lg w-full max-w-sm flex flex-col overflow-hidden relative shadow-2xl border border-[#E5E7EB]">
        
        {/* Header */}
        <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#f8f9fa]">
          <h3 className="font-headline-md font-bold text-[#1C1C1C] text-sm">AI 시뮬레이션 모드 선택</h3>
          <button 
            onClick={onClose}
            className="text-[#5f5e5e] hover:text-[#1C1C1C] transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <button
            onClick={() => onSelectMode('simulation')}
            className="w-full text-left p-4 rounded-lg border-2 border-[#E5E7EB] hover:border-[#3ECF8E] hover:bg-[#3ECF8E]/5 transition-all group flex gap-4 items-start"
          >
            <div className="w-10 h-10 rounded-full bg-[#f3f4f5] group-hover:bg-[#3ECF8E]/20 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-[#1C1C1C]" />
            </div>
            <div>
              <h4 className="font-bold text-[#1C1C1C] mb-1">상황</h4>
              <p className="text-xs text-[#5f5e5e] leading-relaxed">
                갈등 상대방의 페르소나와 직접 대화하며 상황을 시뮬레이션 해봅니다.
              </p>
            </div>
          </button>

          <button
            onClick={() => onSelectMode('explanation')}
            className="w-full text-left p-4 rounded-lg border-2 border-[#E5E7EB] hover:border-[#3ECF8E] hover:bg-[#3ECF8E]/5 transition-all group flex gap-4 items-start"
          >
            <div className="w-10 h-10 rounded-full bg-[#f3f4f5] group-hover:bg-[#3ECF8E]/20 flex items-center justify-center shrink-0">
              <ListTree className="w-5 h-5 text-[#1C1C1C]" />
            </div>
            <div>
              <h4 className="font-bold text-[#1C1C1C] mb-1">상황 설명 모드</h4>
              <p className="text-xs text-[#5f5e5e] leading-relaxed">
                제3자 입장의 AI에게 상황을 분석받고 객관적인 조언을 들어봅니다.
              </p>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
};
