import { beginTask, blockedAction } from '../lib/taskAnalytics';
import React, { useEffect, useRef, useState } from 'react';
import { StoryCategory, Story } from '../types';
import { X, Sparkles, AlertTriangle } from 'lucide-react';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (storyData: {
    title: string;
    category: Exclude<StoryCategory, '전체'>;
    body: string;
    opponentPersonality?: string;
    createAIPersona: boolean;
    requestId: string;
  }) => Promise<void>;
  initialData?: Story | null;
}

const CATEGORIES: Exclude<StoryCategory, '전체'>[] = ['연애', '직장', '친구', '가족', '기타'];

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [category, setCategory] = useState<Exclude<StoryCategory, '전체'>>(initialData?.category || '직장');
  const [body, setBody] = useState(initialData?.body || '');
  const [opponentPersonality, setOpponentPersonality] = useState(initialData?.personaInstruction || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitPendingRef = useRef(false);
  const requestIdRef = useRef(`story-${crypto.randomUUID()}`);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialData?.title || '');
    setCategory(initialData?.category || '직장');
    setBody(initialData?.body || '');
    setOpponentPersonality(initialData?.personaInstruction || '');
    setErrorMessage(null);
    requestIdRef.current = `story-${crypto.randomUUID()}`;
  }, [isOpen, initialData?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitPendingRef.current) { blockedAction(initialData ? 'story_edit' : 'story_publish', 'busy'); return; }

    if (!title.trim()) {
      blockedAction(initialData ? 'story_edit' : 'story_publish', 'validation');
      setErrorMessage('제목을 입력해 주세요.');
      return;
    }
    if (title.length > 30) {
      blockedAction(initialData ? 'story_edit' : 'story_publish', 'validation');
      setErrorMessage('제목은 최대 30자까지 입력할 수 있습니다.');
      return;
    }
    if (body.trim().length < 20) {
      blockedAction(initialData ? 'story_edit' : 'story_publish', 'validation');
      setErrorMessage('사연 본문은 최소 20자 이상 작성해 주세요.');
      return;
    }
    if (body.length > 1000) {
      blockedAction(initialData ? 'story_edit' : 'story_publish', 'validation');
      setErrorMessage('사연 본문은 최대 1,000자까지 작성할 수 있습니다.');
      return;
    }

    setErrorMessage(null);
    submitPendingRef.current = true;
    setIsSubmitting(true);

    const task = beginTask(initialData ? 'story_edit' : 'story_publish');
    try {
      await onSubmit({
        title: title.trim(),
        category,
        body: body.trim(),
        opponentPersonality: opponentPersonality.trim(),
        createAIPersona: true,
        requestId: requestIdRef.current,
      });

      task.finish('success');
      // Reset Form
      setTitle('');
      setBody('');
      setOpponentPersonality('');
      onClose();

    } catch (error) {
      task.finish('error');
      const code = error instanceof Error ? error.message : '';
      setErrorMessage(code === 'ADULT_CONTENT_BLOCKED'
        ? '성인 콘텐츠는 첫 공개에서 등록할 수 없습니다. 내용을 수정한 뒤 다시 검사해 주세요.'
        : code === 'CONTENT_CHECK_FAILED' || code === 'CONTENT_CHECK_UNAVAILABLE'
          ? '콘텐츠 검사에 실패했습니다. 입력은 그대로 두었습니다. 다시 시도해 주세요.'
          : code === 'AUTH_REQUIRED'
            ? '로그인 세션이 만료되었습니다. 입력은 그대로 두었습니다. 다시 로그인해 주세요.'
            : '사연을 저장하지 못했습니다. 입력은 그대로 두었습니다. 다시 시도해 주세요.');
    } finally {
      submitPendingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = isSubmitting;

  return (
    <div data-analytics-screen={initialData?.visibility === "private" || initialData?.isAdult || initialData?.isBlind || initialData?.isHidden ? "excluded" : initialData ? "story_edit" : "story_editor"} data-analytics-layer="20" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[white] border border-[#E5E7EB] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#f8f9fa]">
          <h2 className="text-base sm:text-lg font-bold text-[#1C1C1C] flex items-center gap-2 font-display">
            <span aria-hidden="true" className="material-symbols-outlined text-[#FF6B5A] text-2xl font-bold">terminal</span> {initialData ? '사연 수정하기' : '새 사연 작성'}
          </h2>
          <button data-button-id="create-story-modal-button-01" onClick={onClose} disabled={isSubmitting} className="text-[#5f5e5e] hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
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
            <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
              카테고리 선택 <span className="text-[#FF6B5A]">*</span>
            </label>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button data-button-id="create-story-modal-button-02"
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      category === cat
                        ? 'bg-[#1C1C1C] text-white shadow-xs'
                        : 'bg-[#f8f9fa] text-[#5f5e5e] hover:text-[#1C1C1C] border border-[#E5E7EB]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              
            </div>
            <p className="mt-2 text-[11px] text-[#5f5e5e]">성인 콘텐츠 등록은 첫 공개에서 지원하지 않습니다.</p>
          </div>

          {/* Title */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-[#1C1C1C]">
                사연 제목 <span className="text-[#FF6B5A]">*</span>
              </label>
              <span className="text-[11px] text-[#5f5e5e]">{title.length}/30자</span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 칼퇴 5분 전 일 던지고 나간 팀장님 진짜 이상하지 않나요?"
              maxLength={30}
              className="w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF6B5A]"
            />
          </div>

          {/* Story Body */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-[#1C1C1C]">
                사연 내용 <span className="text-[#FF6B5A]">*</span>
              </label>
              <span className="text-[11px] text-[#5f5e5e]">{body.length}/1000자 (최소 20자)</span>
            </div>
            <textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setErrorMessage(null);
              }}
              placeholder="억울했던 당시 상황, 상대방 대사, 내가 느낀 감정을 구체적으로 편안하게 적어주세요. 작성한 사연은 100% 완전한 익명으로 노출됩니다."
              rows={5}
              maxLength={1000}
              className="w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF6B5A] resize-none"
            />
          </div>

          {/* Opponent Personality (Optional) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-[#1C1C1C]">
                상대방 성격 <span className="text-[#5f5e5e] font-normal">(선택사항)</span>
              </label>
              <span className="text-[11px] text-[#5f5e5e]">{opponentPersonality.length}/100자</span>
            </div>
            <input
              type="text"
              value={opponentPersonality}
              onChange={(e) => setOpponentPersonality(e.target.value)}
              placeholder="예: 뻔뻔하고 자기위주인 성격, 적반하장 스타일, 소심하고 돌려까는 성격 등"
              maxLength={100}
              className="w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF6B5A]"
            />
          </div>

          {/* AI Persona Auto Generation Policy Notice */}
          <div className="p-3.5 bg-[#f8f9fa] border border-[#E5E7EB] rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FF6B5A] text-[#1C1C1C] flex items-center justify-center font-bold shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1C1C1C]">
                  사연의 내용과 상대방 성격을 토대로, AI와 대화하실 수 있습니다.
                </p>
                <p className="text-[11px] text-[#5f5e5e]">
                  사연 등록 후 곧바로 내 상대방 AI 페르소나와 1:1 대화를 나눌 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button data-button-id="create-story-modal-button-03"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-xs font-bold text-[#5f5e5e] hover:bg-[#f8f9fa] cursor-pointer"
            >
              취소
            </button>
            <button data-button-id="create-story-modal-button-04"
              type="submit"
              disabled={isSubmitDisabled}
              className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 ${
                isSubmitDisabled 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-[#1C1C1C] hover:bg-[#333333] active:scale-95 cursor-pointer'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>확인·저장 중...</span>
                </>
              ) : (
                initialData ? '수정 저장하기' : '사연 등록하기'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
