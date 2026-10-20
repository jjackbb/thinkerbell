import { beginTask, blockedAction } from '../lib/taskAnalytics';
import React, { useEffect, useRef, useState } from 'react';
import { StoryCategory, Story } from '../types';
import { X, MessagesSquare, AlertTriangle, Globe, Lock } from 'lucide-react';

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
    visibility: StoryVisibility;
    sideLabelA: string;
    sideLabelB: string;
  }) => Promise<void>;
  initialData?: Story | null;
  /** 비공개 기능이 켜져 있고 DB가 준비됐을 때만 공개 범위를 고를 수 있다 */
  privateAvailable?: boolean;
}

type StoryVisibility = 'public' | 'private';

const VISIBILITY_OPTIONS: { value: StoryVisibility; label: string; Icon: typeof Globe }[] = [
  { value: 'public', label: '공개', Icon: Globe },
  { value: 'private', label: '비공개', Icon: Lock },
];

const CATEGORIES: Exclude<StoryCategory, '전체'>[] = ['연애', '직장', '친구', '가족', '기타'];

type FieldErrors = { category?: string; visibility?: string; title?: string; body?: string };

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  privateAvailable = false,
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  // 새 사연은 카테고리를 고르지 않은 상태로 시작한다. 수정할 때만 기존 값을 채운다.
  const [category, setCategory] = useState<Exclude<StoryCategory, '전체'> | null>(initialData?.category ?? null);
  const [body, setBody] = useState(initialData?.body || '');
  // 공개 범위는 필수지만 기본값은 공개다. 수정할 때는 지금 상태를 채운다.
  const [visibility, setVisibility] = useState<StoryVisibility>(initialData?.visibility ?? 'public');
  const [opponentPersonality, setOpponentPersonality] = useState(initialData?.personaInstruction || '');
  // 니 편(B)·내 편(A) 역할 이름(선택). 투표 버튼에 작은 글씨로 함께 보인다.
  const [sideLabelB, setSideLabelB] = useState(initialData?.sideLabelB || '');
  const [sideLabelA, setSideLabelA] = useState(initialData?.sideLabelA || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 필수 항목별 안내. 등록을 눌렀을 때 비어 있는 칸을 한꺼번에 표시한다.
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const categoryRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitPendingRef = useRef(false);
  const requestIdRef = useRef(`story-${crypto.randomUUID()}`);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialData?.title || '');
    setCategory(initialData?.category ?? null);
    setBody(initialData?.body || '');
    setVisibility(initialData?.visibility ?? 'public');
    setOpponentPersonality(initialData?.personaInstruction || '');
    setSideLabelB(initialData?.sideLabelB || '');
    setSideLabelA(initialData?.sideLabelA || '');
    setErrorMessage(null);
    setFieldErrors({});
    requestIdRef.current = `story-${crypto.randomUUID()}`;
  }, [isOpen, initialData?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitPendingRef.current) { blockedAction(initialData ? 'story_edit' : 'story_publish', 'busy'); return; }

    const errors: FieldErrors = {};
    if (!category) errors.category = '카테고리를 선택해 주세요.';
    if (visibility !== 'public' && visibility !== 'private') errors.visibility = '공개 범위를 선택해 주세요.';
    if (!title.trim()) errors.title = '제목을 입력해 주세요.';
    else if (title.length > 30) errors.title = '제목은 최대 30자까지 입력할 수 있습니다.';
    if (!body.trim()) errors.body = '사연 내용을 입력해 주세요.';
    else if (body.trim().length < 20) errors.body = '사연 내용은 최소 20자 이상 작성해 주세요.';
    else if (body.length > 1000) errors.body = '사연 내용은 최대 1,000자까지 작성할 수 있습니다.';

    if (errors.category || errors.visibility || errors.title || errors.body || !category) {
      blockedAction(initialData ? 'story_edit' : 'story_publish', 'validation');
      setFieldErrors(errors);
      setErrorMessage('필수 항목을 입력해 주세요.');
      // 첫 번째로 빠진 칸으로 이동해 바로 입력할 수 있게 한다
      if (errors.category) categoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      else if (errors.title) titleRef.current?.focus();
      else bodyRef.current?.focus();
      return;
    }

    setFieldErrors({});
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
        // 비공개 기능이 꺼져 있으면 고를 수 없으므로 항상 공개로 보낸다
        visibility: privateAvailable ? visibility : 'public',
        sideLabelA: sideLabelA.trim(),
        sideLabelB: sideLabelB.trim(),
      });

      task.finish('success');
      // Reset Form
      setTitle('');
      setBody('');
      setOpponentPersonality('');
      setSideLabelA('');
      setSideLabelB('');
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

  // 고친 칸의 안내는 바로 지운다. 모든 칸이 채워지면 맨 위 안내도 지운다.
  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev, [field]: undefined };
      if (!next.category && !next.visibility && !next.title && !next.body) setErrorMessage(null);
      return next;
    });
  };

  return (
    <div data-analytics-screen={initialData?.visibility === "private" || initialData?.isAdult || initialData?.isBlind || initialData?.isHidden ? "excluded" : initialData ? "story_edit" : "story_editor"} data-analytics-layer="20" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[white] border border-[#E5E7EB] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#f8f9fa]">
          <h2 className="text-base sm:text-lg font-bold text-[#1C1C1C] flex items-center gap-2 font-display">
            <span aria-hidden="true" className="material-symbols-outlined text-[#FF6B5A] text-2xl font-bold">terminal</span> {initialData ? '사연 수정하기' : '새 사연 작성'}
          </h2>
          <button data-button-id="create-story-modal-button-01" aria-label="사연 작성 닫기" onClick={onClose} disabled={isSubmitting} className="text-[#5f5e5e] hover:text-[#1C1C1C] transition-colors cursor-pointer p-2 disabled:opacity-50 disabled:cursor-not-allowed">
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
          <div ref={categoryRef}>
            <label id="create-story-category-label" className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
              카테고리 선택 <span className="text-[#FF6B5A]">*</span>
            </label>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button data-button-id="create-story-modal-button-02"
                    key={cat}
                    type="button"
                    aria-pressed={category === cat}
                    onClick={() => { setCategory(cat); clearFieldError('category'); }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      category === cat
                        ? 'bg-[#1C1C1C] text-white shadow-xs'
                        : `bg-[#f8f9fa] text-[#5f5e5e] hover:text-[#1C1C1C] border ${fieldErrors.category ? 'border-red-300' : 'border-[#E5E7EB]'}`
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              
            </div>
            {fieldErrors.category && <p role="alert" className="mt-1.5 text-[11px] font-semibold text-red-600">{fieldErrors.category}</p>}
            <p className="mt-2 text-[11px] text-[#5f5e5e]">성인 콘텐츠 등록은 첫 공개에서 지원하지 않습니다.</p>
          </div>

          {/* Visibility */}
          {privateAvailable && (
            <div>
              <label id="create-story-visibility-label" className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
                공개 범위 <span className="text-[#FF6B5A]">*</span>
              </label>
              <div role="radiogroup" aria-labelledby="create-story-visibility-label" className="grid grid-cols-2 gap-2">
                {VISIBILITY_OPTIONS.map(({ value, label, Icon }) => {
                  const selected = visibility === value;
                  return (
                    <button data-button-id={`create-story-modal-visibility-${value}`}
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => { setVisibility(value); clearFieldError('visibility'); }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        selected
                          ? 'border-[#1C1C1C] bg-[#1C1C1C] text-white'
                          : `bg-[#f8f9fa] text-[#1C1C1C] hover:border-[#1C1C1C] ${fieldErrors.visibility ? 'border-red-300' : 'border-[#E5E7EB]'}`
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {label}
                    </button>
                  );
                })}
              </div>
              {fieldErrors.visibility && <p role="alert" className="mt-1.5 text-[11px] font-semibold text-red-600">{fieldErrors.visibility}</p>}
              {visibility === 'private' && (
                <p className="mt-2 text-[11px] text-[#5f5e5e]">비공개 사연은 피드·랭킹에 나오지 않고, 다른 이용자가 투표·댓글을 남길 수 없어요. 나중에 사연 화면에서 공개로 바꿀 수 있어요.</p>
              )}
            </div>
          )}

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
              ref={titleRef}
              value={title}
              onChange={(e) => { setTitle(e.target.value); clearFieldError('title'); }}
              aria-invalid={Boolean(fieldErrors.title)}
              placeholder="예: 칼퇴 5분 전 일 던지고 나간 팀장님 진짜 이상하지 않나요?"
              maxLength={30}
              className={`w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF6B5A] ${fieldErrors.title ? 'border-red-300' : 'border-[#E5E7EB]'}`}
            />
            {fieldErrors.title && <p role="alert" className="mt-1.5 text-[11px] font-semibold text-red-600">{fieldErrors.title}</p>}
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
              ref={bodyRef}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                clearFieldError('body');
              }}
              aria-invalid={Boolean(fieldErrors.body)}
              placeholder="억울했던 당시 상황, 상대방 대사, 내가 느낀 감정을 구체적으로 편안하게 적어주세요. 본문에는 이름·연락처 등 식별 정보를 적지 마세요."
              rows={5}
              maxLength={1000}
              className={`w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF6B5A] resize-none ${fieldErrors.body ? 'border-red-300' : 'border-[#E5E7EB]'}`}
            />
            {fieldErrors.body && <p role="alert" className="mt-1 text-[11px] font-semibold text-red-600">{fieldErrors.body}</p>}
          </div>

          {/* Side labels (Optional) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-[#1C1C1C]">
                니 편·내 편 역할 <span className="text-[#5f5e5e] font-normal">(선택사항)</span>
              </label>
              <span className="text-[11px] text-[#5f5e5e]">각 10자</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="create-story-side-label-b" className="block mb-1 text-[11px] font-bold text-[var(--color-your-side-ink)]">니 편 (상대방)</label>
                <input
                  id="create-story-side-label-b"
                  type="text"
                  value={sideLabelB}
                  onChange={(e) => setSideLabelB(e.target.value)}
                  placeholder="예: 직장동료"
                  maxLength={10}
                  className="w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF6B5A]"
                />
              </div>
              <div>
                <label htmlFor="create-story-side-label-a" className="block mb-1 text-[11px] font-bold text-[var(--color-my-side-ink)]">내 편 (나)</label>
                <input
                  id="create-story-side-label-a"
                  type="text"
                  value={sideLabelA}
                  onChange={(e) => setSideLabelA(e.target.value)}
                  placeholder="예: 신입사원"
                  maxLength={10}
                  className="w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF6B5A]"
                />
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-[#5f5e5e]">적으면 투표 버튼에 함께 보여서, 읽는 사람이 누구 편을 드는지 알기 쉬워요.</p>
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

          {/* AI 대화 안내. 입력칸(회색 상자)과 헷갈리지 않도록 상자 없이 안내 글줄로만 둔다 */}
          <p className="flex items-center gap-1.5 px-1 text-[11px] text-[#5f5e5e]">
            <MessagesSquare className="w-3.5 h-3.5 text-[#D6452F] shrink-0" aria-hidden="true" />
            사연의 내용과 상대방 성격을 토대로, AI와 대화하실 수 있습니다.
          </p>

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
