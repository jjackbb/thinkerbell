import React, { useState } from 'react';
import { X, MessageSquare, ListTree, ChevronLeft } from 'lucide-react';

/** 상황 모드에서 대화를 어느 지점부터 시작할지 */
export type ChatOpening = 'apology' | 'oblivious' | 'meFirst';

export const OPENINGS: { id: ChatOpening; label: string; desc: string; recommended?: boolean }[] = [
  { id: 'apology',   label: '상대가 먼저 사과해 온 상황', desc: '누그러진 상태에서 시작해요' },
  { id: 'oblivious', label: '아무 일 없다는 듯 구는 상황', desc: '가장 답답한 지점부터 시작해요', recommended: true },
  { id: 'meFirst',   label: '내가 먼저 말을 꺼내는 상황',  desc: '내 첫 마디로 시작해요' },
];

interface AIChatModeSelectionModalProps {
  onClose: () => void;
  onSelectMode: (mode: 'simulation' | 'explanation', opening?: ChatOpening) => void;
  /** 대화 상대 호칭 (예: 직장 상대) */
  opponentLabel?: string;
}

export const AIChatModeSelectionModal: React.FC<AIChatModeSelectionModalProps> = ({
  onClose,
  onSelectMode,
  opponentLabel = '상대방',
}) => {
  const [step, setStep] = useState<'mode' | 'opening'>('mode');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white rounded-lg w-full max-w-sm flex flex-col overflow-hidden relative shadow-2xl border border-[#E5E7EB]">

        <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#f8f9fa]">
          <div className="flex items-center gap-2">
            {step === 'opening' && (
              <button onClick={() => setStep('mode')} className="text-[#5f5e5e] hover:text-[#1C1C1C] p-0.5 cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <h3 className="font-headline-md font-bold text-[#1C1C1C] text-sm">
              {step === 'mode' ? 'AI 시뮬레이션 모드 선택' : '어디서부터 시작할까요?'}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#5f5e5e] hover:text-[#1C1C1C] transition-colors p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'mode' ? (
          <div className="p-6 space-y-4">
            <button
              onClick={() => setStep('opening')}
              className="w-full text-left p-4 rounded-lg border-2 border-[#E5E7EB] hover:border-[#FF6B5A] hover:bg-[#FF6B5A]/5 transition-all group flex gap-4 items-start cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#f3f4f5] group-hover:bg-[#FF6B5A]/20 flex items-center justify-center shrink-0">
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
              className="w-full text-left p-4 rounded-lg border-2 border-[#E5E7EB] hover:border-[#FF6B5A] hover:bg-[#FF6B5A]/5 transition-all group flex gap-4 items-start cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#f3f4f5] group-hover:bg-[#FF6B5A]/20 flex items-center justify-center shrink-0">
                <ListTree className="w-5 h-5 text-[#1C1C1C]" />
              </div>
              <div>
                <h4 className="font-bold text-[#1C1C1C] mb-1">공감</h4>
                <p className="text-xs text-[#5f5e5e] leading-relaxed">
                  상황 이해 중심의 위로 대화 시뮬레이션을 진행합니다.
                </p>
              </div>
            </button>
          </div>
        ) : (
          /* 같은 갈등을 세 가지 온도로 다시 볼 수 있게 한다.
             사연 하나가 한 번 쓰고 끝나지 않게 만드는 장치다. */
          <div className="p-6 space-y-3">
            <p className="text-xs text-[#5f5e5e] leading-relaxed mb-1">
              {opponentLabel}와의 대화를 어느 지점부터 시작할지 고르세요.
              같은 갈등이라도 시작점에 따라 완전히 다르게 흘러갑니다.
            </p>

            {OPENINGS.map(o => (
              <button
                key={o.id}
                onClick={() => onSelectMode('simulation', o.id)}
                className="w-full text-left p-3.5 rounded-lg border-2 border-[#E5E7EB] hover:border-[#FF6B5A] hover:bg-[#FF6B5A]/5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-bold text-sm text-[#1C1C1C]">{o.label}</h4>
                  {o.recommended && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FF6B5A] text-white shrink-0">추천</span>
                  )}
                </div>
                <p className="text-xs text-[#5f5e5e]">{o.desc}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
