import React, { useState } from 'react';
import { Key, X, Check, Bot, AlertCircle } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  apiKey: string;
  onClose: () => void;
  onSaveKey: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  apiKey,
  onClose,
  onSaveKey,
}) => {
  if (!isOpen) return null;

  const [inputKey, setInputKey] = useState(apiKey);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveKey(inputKey.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#fffaf0] border border-[#e8e2d0] rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#ebe6d6] pb-3">
          <h3 className="text-base font-bold text-[#0a0a0a] flex items-center gap-2 font-display">
            <Key className="w-5 h-5 text-[#ff4d8b]" /> Potens.ai API Key 설정
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-xl hover:bg-[#f5f0e0] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#f5f0e0] p-4 rounded-2xl border border-[#e8e2d0] space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0a0a0a]">
            <Bot className="w-4 h-4 text-[#ff4d8b]" /> claude-4-6-sonnet 모델 연동
          </div>
          <p className="text-xs text-[#6a6a6a] leading-relaxed">
            `https://ai.potens.ai/api/chat` 및 `/api/chat-stream` API 요청 시 사용되는 인증 키입니다. 키를 입력하시면 실시간 AI 1:1 대화 시뮬레이션에 사용됩니다.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#0a0a0a] mb-1">
              Potens.ai Bearer API Key
            </label>
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="API Key 입력 (예: ptn_xxx...)"
              className="w-full p-3 text-xs bg-[#faf5e8] border border-[#e8e2d0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#ff4d8b] font-mono"
            />
          </div>

          {savedSuccess && (
            <div className="p-2.5 bg-[#0a0a0a] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
              <Check className="w-4 h-4 text-[#ff4d8b]" /> API 키가 성공적으로 저장되었습니다!
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#e8e2d0] text-xs font-bold text-[#6a6a6a] hover:bg-[#f5f0e0] cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#0a0a0a] hover:bg-[#1f1f1f] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
            >
              저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
