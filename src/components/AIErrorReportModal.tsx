import React, { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { AIPersona } from '../types';

interface AIErrorReportModalProps {
  persona: AIPersona;
  onClose: () => void;
  onSubmit: (personaId: string, errorContent: string) => void;
}

export const AIErrorReportModal: React.FC<AIErrorReportModalProps> = ({ persona, onClose, onSubmit }) => {
  const [errorContent, setErrorContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!errorContent.trim()) return;
    onSubmit(persona.id, errorContent);
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[#E5E7EB]">
        
        {/* Header */}
        <div className="bg-[#1C1C1C] text-white px-5 py-4 flex items-center justify-between border-b border-[#1C1C1C]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#ba1a1a]" />
            <h2 className="font-headline-md text-base font-bold">오류 신고</h2>
          </div>
          <button onClick={onClose} className="text-[#5f5e5e] hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-sm font-body-sm text-[#1C1C1C] mb-4">
            <strong className="text-[#3ECF8E] font-bold">[{persona.name}]</strong> 와의 대화 중 발생한 오류를 자세히 적어주세요. 신속히 확인하여 개선하겠습니다.
          </p>

          <textarea
            value={errorContent}
            onChange={(e) => setErrorContent(e.target.value)}
            className="w-full bg-[#f8f9fa] border border-[#E5E7EB] rounded px-4 py-3 font-body-sm text-sm focus:outline-none focus:border-[#3ECF8E] resize-none h-32"
            placeholder="예: AI가 문맥에 맞지 않는 엉뚱한 대답을 합니다."
            required
            autoFocus
          />

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-[#E5E7EB] text-[#5f5e5e] rounded font-mono font-bold text-xs hover:bg-[#f3f4f5] transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!errorContent.trim()}
              className="flex-1 py-3 px-4 bg-[#ba1a1a] text-white rounded font-mono font-bold text-xs hover:bg-[#93000a] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              신고 접수
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
