import React, { useState } from 'react';
import { StoryCategory, Story } from '../types';
import { X, Sparkles, MessageSquareHeart, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (storyData: {
    title: string;
    category: Exclude<StoryCategory, '전체'>;
    body: string;
    opponentPersonality?: string;
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
  const [opponentPersonality, setOpponentPersonality] = useState('');
  const [isAdultCheck, setIsAdultCheck] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Adult content validation state
  const [isCheckingAdult, setIsCheckingAdult] = useState(false);
  const [showAdultWarning, setShowAdultWarning] = useState(false);
  const [aiDetectedAdult, setAiDetectedAdult] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
    setIsCheckingAdult(true);

    try {
      // AI 19금 필터링
      const res = await fetch('/api/check-adult-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim() })
      });
      
      const data = await res.json();
      const isContentAdult = data.isAdult;

      if (isContentAdult) {
        setAiDetectedAdult(true);
      }

      if (isContentAdult && !isAdultCheck) {
        // 19금 콘텐츠인데 체크하지 않은 경우 경고창 띄우기
        setShowAdultWarning(true);
        setIsCheckingAdult(false);
        return;
      }

      // 등록 진행
      onSubmit({
        title: title.trim(),
        category,
        body: body.trim(),
        opponentPersonality: opponentPersonality.trim(),
        createAIPersona: true,
      });

      // Reset Form
      setTitle('');
      setBody('');
      setOpponentPersonality('');
      setIsAdultCheck(false);
      setAiDetectedAdult(false);
      onClose();

    } catch (error) {
      console.error('Adult content check error:', error);
      setErrorMessage('콘텐츠 확인 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsCheckingAdult(false);
    }
  };

  // 요구사항 3: AI가 19금으로 판별했는데 19금 체크가 안되어있으면 버튼 비활성화
  // 또는 로딩 중일 때 버튼 비활성화
  const isSubmitDisabled = isCheckingAdult || (aiDetectedAdult && !isAdultCheck);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#fffaf0] border border-[#e8e2d0] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* Warning Modal Overlay (19금 미체크 시 팝업) */}
        {showAdultWarning && (
          <div className="absolute inset-0 z-10 bg-[#fffaf0]/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white border border-red-200 shadow-2xl rounded-3xl p-8 max-w-sm w-full text-center space-y-5">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertOctagon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0a0a0a] mb-2">19금 콘텐츠 감지됨</h3>
                <p className="text-sm text-[#6a6a6a] leading-relaxed font-medium">
                  사연 내용이 성적 내용 또는 부적절한 내용을 포함하고 있는 것으로 판단됩니다.<br/>
                  등록하시려면 창을 닫고 <span className="font-bold text-red-500">'19금'</span> 체크를 해주세요.
                </p>
              </div>
              <div className="pt-2 flex justify-center">
                <button
                  onClick={() => setShowAdultWarning(false)}
                  className="px-8 py-3 bg-[#0a0a0a] hover:bg-[#1f1f1f] text-white font-bold rounded-xl active:scale-95 transition-all cursor-pointer shadow-md"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}

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

          {/* Category Select & 19+ Checkbox */}
          <div>
            <label className="block text-xs font-bold text-[#0a0a0a] mb-1.5">
              카테고리 선택 <span className="text-[#ff4d8b]">*</span>
            </label>
            <div className="flex flex-wrap items-center justify-between gap-2">
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
              
              {/* 19+ Checkbox at the far right */}
              <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                isAdultCheck ? 'bg-red-50 border-red-300 text-red-600' : 'bg-[#f5f0e0] border-[#e8e2d0] text-[#6a6a6a] hover:bg-[#ebe6d6]'
              }`}>
                <input
                  type="checkbox"
                  checked={isAdultCheck}
                  onChange={(e) => setIsAdultCheck(e.target.checked)}
                  className="w-3.5 h-3.5 accent-red-500 rounded border-gray-300 cursor-pointer"
                />
                <span className="text-xs font-black">19금</span>
              </label>
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
              onChange={(e) => {
                setBody(e.target.value);
                setAiDetectedAdult(false); // 내용이 바뀌면 경고 상태 리셋
              }}
              placeholder="억울했던 당시 상황, 상대방 대사, 내가 느낀 감정을 구체적으로 편안하게 적어주세요. 작성한 사연은 100% 완전한 익명으로 노출됩니다."
              rows={5}
              maxLength={1000}
              className="w-full p-3 text-xs sm:text-sm bg-[#faf5e8] border border-[#e8e2d0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#ff4d8b] resize-none"
            />
          </div>

          {/* Opponent Personality (Optional) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-[#0a0a0a]">
                상대방 성격 <span className="text-[#6a6a6a] font-normal">(선택사항)</span>
              </label>
              <span className="text-[11px] text-[#6a6a6a]">{opponentPersonality.length}/100자</span>
            </div>
            <input
              type="text"
              value={opponentPersonality}
              onChange={(e) => setOpponentPersonality(e.target.value)}
              placeholder="예: 뻔뻔하고 자기위주인 성격, 적반하장 스타일, 소심하고 돌려까는 성격 등"
              maxLength={100}
              className="w-full p-3 text-xs sm:text-sm bg-[#faf5e8] border border-[#e8e2d0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#ff4d8b]"
            />
          </div>

          {/* AI Persona Auto Generation Policy Notice */}
          <div className="p-3.5 bg-[#f5f0e0] border border-[#e8e2d0] rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#b8a4ed] text-[#0a0a0a] flex items-center justify-center font-bold shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#0a0a0a]">
                  사연의 내용과 상대방 성격을 토대로, AI와 대화하실 수 있습니다.
                </p>
                <p className="text-[11px] text-[#6a6a6a]">
                  사연 등록 후 곧바로 내 상대방 AI 페르소나와 1:1 대화를 나눌 수 있습니다.
                </p>
              </div>
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
              disabled={isSubmitDisabled}
              className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 ${
                isSubmitDisabled 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-[#0a0a0a] hover:bg-[#1f1f1f] active:scale-95 cursor-pointer'
              }`}
            >
              {isCheckingAdult ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>분석 중...</span>
                </>
              ) : (
                '사연 등록하기'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
