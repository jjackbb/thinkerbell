import React, { useState } from 'react';
import { X, Settings2 } from 'lucide-react';

export type ExplainRatio = 'High' | 'Middle' | 'Low';

interface AIExplainSettingsModalProps {
  initialRatio?: ExplainRatio;
  onClose: () => void;
  onConfirm: (ratio: ExplainRatio) => void;
}

export const AIExplainSettingsModal: React.FC<AIExplainSettingsModalProps> = ({
  initialRatio = 'Middle',
  onClose,
  onConfirm,
}) => {
  const [ratio, setRatio] = useState<ExplainRatio>(initialRatio);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white rounded-lg w-full max-w-sm flex flex-col overflow-hidden relative shadow-2xl border border-[#E5E7EB]">
        
        {/* Header */}
        <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#f8f9fa]">
          <h3 className="font-headline-md font-bold text-[#1C1C1C] text-sm flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-[#3ECF8E]" />
            상황 설명 모드 설정
          </h3>
          <button 
            onClick={onClose}
            className="text-[#5f5e5e] hover:text-[#1C1C1C] transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div>
            <h4 className="font-bold text-[#1C1C1C] mb-2 text-sm">AI 성향 비율 설정</h4>
            <p className="text-xs text-[#5f5e5e] mb-4 leading-relaxed">
              AI가 나를 얼마나 옹호할지, 혹은 얼마나 객관적으로 비판할지 선택하세요.
            </p>
            
            <div className="space-y-3">
              <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${ratio === 'High' ? 'border-[#3ECF8E] bg-[#3ECF8E]/5' : 'border-[#E5E7EB] hover:border-[#3ECF8E]/50'}`}>
                <input 
                  type="radio" 
                  name="ratio" 
                  checked={ratio === 'High'} 
                  onChange={() => setRatio('High')}
                  className="text-[#3ECF8E] focus:ring-[#3ECF8E]"
                />
                <div>
                  <div className="font-bold text-sm text-[#1C1C1C]">High (무조건 내 편)</div>
                  <div className="text-xs text-[#5f5e5e]">상황을 철저히 내 입장에서 옹호하며 위로해줍니다.</div>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${ratio === 'Middle' ? 'border-[#3ECF8E] bg-[#3ECF8E]/5' : 'border-[#E5E7EB] hover:border-[#3ECF8E]/50'}`}>
                <input 
                  type="radio" 
                  name="ratio" 
                  checked={ratio === 'Middle'} 
                  onChange={() => setRatio('Middle')}
                  className="text-[#3ECF8E] focus:ring-[#3ECF8E]"
                />
                <div>
                  <div className="font-bold text-sm text-[#1C1C1C]">Middle (공감 반 / 객관 반)</div>
                  <div className="text-xs text-[#5f5e5e]">적절한 공감과 함께 제3자 입장에서 객관적으로 분석합니다.</div>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${ratio === 'Low' ? 'border-[#3ECF8E] bg-[#3ECF8E]/5' : 'border-[#E5E7EB] hover:border-[#3ECF8E]/50'}`}>
                <input 
                  type="radio" 
                  name="ratio" 
                  checked={ratio === 'Low'} 
                  onChange={() => setRatio('Low')}
                  className="text-[#3ECF8E] focus:ring-[#3ECF8E]"
                />
                <div>
                  <div className="font-bold text-sm text-[#1C1C1C]">Low (극사실주의 객관)</div>
                  <div className="text-xs text-[#5f5e5e]">냉정하게 팩트만을 기반으로 상황을 분석하고 비판합니다.</div>
                </div>
              </label>
            </div>
          </div>

          <button
            onClick={() => onConfirm(ratio)}
            className="w-full bg-[#1C1C1C] text-[#3ECF8E] font-bold text-sm py-3 rounded-lg hover:bg-black transition-colors"
          >
            확인
          </button>
        </div>

      </div>
    </div>
  );
};
