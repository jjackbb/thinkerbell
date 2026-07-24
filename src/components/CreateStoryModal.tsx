import React, { useState } from 'react';
import { StoryCategory, Story } from '../types';
import { X, Sparkles, MessageSquareHeart, CheckCircle2, AlertTriangle } from 'lucide-react';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (storyData: {
    title: string;
    category: Exclude<StoryCategory, '전체'>;
    body: string;
    createAIPersona: boolean;
  }) => void;
}

const CATEGORIES: Exclude<StoryCategory, '전체'>[] = ['연애', '직장', '친구', '가족', '기타'];

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Exclude<StoryCategory, '전체'>>('직장');
  const [body, setBody] = useState('');
  const [createAIPersona, setCreateAIPersona] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMessage('제목을 입력해 주세요.');
      return;
    }
    if (title.length > 30) {
      setErrorMessage('제목은 최대 30자까지 입력할 수 있습니다.');
      return;
    }
    if (body.trim().length < 20) {
      setErrorMessage('사연 본문은 최소 20자 이상 작성해 주세요.');
      return;
    }
    if (body.length > 1000) {
      setErrorMessage('사연 본문은 최대 1,000자까지 작성할 수 있습니다.');
      return;
    }

    setErrorMessage(null);
    onSubmit({
      title: title.trim(),
      category,
      body: body.trim(),
      createAIPersona,
    });

    // Reset Form
    setTitle('');
    setBody('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#fffaf0] border border-[#e8e2d0] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#ebe6d6] flex items-center justify-between bg-[#faf5e8]">
          <h2 className="text-base sm:text-lg font-bold text-[#0a0a0a] flex items-center gap-2 font-display">
            <MessageSquareHeart className="w-5 h-5 text-[#ff4d8b]" /> 익명 사연 등록하기
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#e8e2d0] text-[#0a0a0a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Category Select */}
          <div>
            <label className="block text-xs font-bold text-[#0a0a0a] mb-1.5">
              카테고리 선택 <span className="text-[#ff4d8b]">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    category === cat
                      ? 'bg-[#0a0a0a] text-white shadow-xs'
                      : 'bg-[#f5f0e0] text-[#6a6a6a] hover:text-[#0a0a0a] border border-[#e8e2d0]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-[#0a0a0a]">
                사연 제목 <span className="text-[#ff4d8b]">*</span>
              </label>
              <span className="text-[11px] text-[#6a6a6a]">{title.length}/30자</span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 칼퇴 5분 전 일 던지고 나간 팀장님 진짜 이상하지 않나요?"
              maxLength={30}
              className="w-full p-3 text-xs sm:text-sm bg-[#faf5e8] border border-[#e8e2d0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#ff4d8b]"
            />
          </div>

          {/* Story Body */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-[#0a0a0a]">
                사연 내용 <span className="text-[#ff4d8b]">*</span>
              </label>
              <span className="text-[11px] text-[#6a6a6a]">{body.length}/1000자 (최소 20자)</span>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="억울했던 당시 상황, 상대방 대사, 내가 느낀 감정을 구체적으로 편안하게 적어주세요. 작성한 사연은 100% 완전한 익명으로 노출됩니다."
              rows={6}
              maxLength={1000}
              className="w-full p-3 text-xs sm:text-sm bg-[#faf5e8] border border-[#e8e2d0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#ff4d8b] resize-none"
            />
          </div>

          {/* AI Persona Auto Generation Checkbox */}
          <div
            onClick={() => setCreateAIPersona(!createAIPersona)}
            className="p-3.5 bg-[#f5f0e0] border border-[#e8e2d0] rounded-2xl flex items-center justify-between cursor-pointer hover:bg-[#ebe6d6] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#b8a4ed] text-[#0a0a0a] flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#0a0a0a]">
                  이 사연으로 1:1 대화 상대 AI 생성하기
                </p>
                <p className="text-[11px] text-[#6a6a6a]">
                  사연 등록 후 곧바로 내 상대방 AI 페르소나와 1:1 대화를 나눌 수 있습니다.
                </p>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
              createAIPersona ? 'bg-[#ff4d8b] border-[#ff4d8b] text-white' : 'border-gray-400 bg-white'
            }`}>
              {createAIPersona && <CheckCircle2 className="w-4 h-4" />}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#e8e2d0] text-xs font-bold text-[#6a6a6a] hover:bg-[#f5f0e0] cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#0a0a0a] hover:bg-[#1f1f1f] text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer"
            >
              사연 등록하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
