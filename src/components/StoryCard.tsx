import React, { useState, useRef, useEffect } from 'react';
import { Story, UserProfile, Comment } from '../types';
import { VoteResult } from './VoteResult';
import { IssueSummary } from './IssueSummary';
import { ShieldAlert, Share2, Heart, MoreVertical, Edit2, EyeOff, Trash2, CheckCircle } from 'lucide-react';

interface StoryCardProps {
  story: Story;
  currentUser?: UserProfile;
  onSelect: (story: Story) => void;
  onVote: (storyId: string, option: 'A' | 'B') => void;
  onReport: (storyId: string) => void;
  onEdit?: (storyId: string) => void;
  onDelete?: (storyId: string) => void;
  onHide?: (storyId: string) => void;
  isUserAdultVerified?: boolean;
  onRequireAdultVerification?: () => void;
  comments?: Comment[];
  isGuest?: boolean;
  /** 가려진 내 글에 이의를 제기할 때 */
  onAppeal?: (storyId: string) => void;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  currentUser,
  onSelect,
  onVote,
  onReport,
  onEdit,
  onDelete,
  onHide,
  isUserAdultVerified,
  onRequireAdultVerification,
  comments = [],
  isGuest = false,
  onAppeal,
}) => {
  const [votedOption, setVotedOption] = useState<'A' | 'B' | null>(story.userVoted || null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeCommentTab, setActiveCommentTab] = useState<'all' | 'A' | 'B' | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 서버에서 내 투표 기록을 불러오면 카드 상태도 따라가야 한다
  useEffect(() => {
    setVotedOption(story.userVoted ?? null);
  }, [story.userVoted]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isExpanded && cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
      if (isMenuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded, isMenuOpen]);

  const isBlurRequired = story.isAdult && !isUserAdultVerified;
  const isMyStory = currentUser?.id === story.authorId;

  const handleVoteClick = (e: React.MouseEvent, option: 'A' | 'B') => {
    e.stopPropagation();
    if (isMyStory) return;
    if (votedOption && story.voteChanged) return; // Prevent if already changed
    // 게스트는 로그인 안내만 띄우고 카드 상태는 그대로 둔다
    if (isGuest) {
      onVote(story.id, option);
      return;
    }
    setVotedOption(option);
    setActiveCommentTab(option);
    onVote(story.id, option);
  };

  const totalVotes = story.votesA + story.votesB;
  const percentA = totalVotes > 0 ? Math.round((story.votesA / totalVotes) * 100) : 0;
  const percentB = totalVotes > 0 ? 100 - percentA : 0;
  const isZeroVotes = totalVotes === 0;

  // 신고로 가려진 내 글은 본문 대신 상태 카드로 보여준다.
  // 왜 가려졌는지 모르는 채 사라지는 것이 이탈을 만든다.
  if (story.isBlind && isMyStory) {
    const appealed = story.appealStatus === 'pending';
    return (
      <article className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden shadow-xs p-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="font-label-sm text-xs px-2.5 py-0.5 bg-[#f3f4f5] border border-[#E5E7EB] text-[#5f5e5e] font-semibold rounded">
            {story.category}
          </span>
          <span className="font-label-sm text-[11px] text-[#5f5e5e]/60">
            {new Date(story.createdAt).toLocaleDateString()}
          </span>
        </div>

        <div>
          <p className="text-sm font-bold text-[#1C1C1C] mb-1">
            신고가 접수되어 검토 중인 글입니다
          </p>
          <p className="text-xs text-[#5f5e5e] leading-relaxed">
            여러 사람이 신고해 지금은 다른 사람에게 보이지 않습니다.
            내용이 규칙에 어긋나지 않는다고 생각하시면 이의를 제기해 주세요.
          </p>
        </div>

        <p className="text-xs text-[#5f5e5e]/70 line-clamp-2 bg-[#f9fafb] rounded-lg p-3">
          {story.title}
        </p>

        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] text-[#5f5e5e]">
            신고 {story.reportsCount}건 · 조회 {story.viewCount ?? 0}회
          </span>
          {appealed ? (
            <span className="text-xs font-bold text-[#4553C4]">이의 제기 검토 중</span>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onAppeal?.(story.id); }}
              className="px-3 py-1.5 rounded-lg bg-[#1C1C1C] text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer"
            >
              이의 제기
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <article
      ref={cardRef}
      onClick={() => {
        if (isBlurRequired && onRequireAdultVerification) {
          onRequireAdultVerification();
        } else {
          onSelect(story);
        }
      }}
      className={`bg-white group hover:border-[#FF6B5A] transition-all duration-300 flex flex-col cursor-pointer rounded-lg overflow-hidden shadow-xs hover:-translate-y-1 relative ${
        isMyStory
          ? 'border-2 border-[#FF6B5A]'
          : 'border border-[#E5E7EB]'
      }`}
    >
      {/* Top Meta Header */}
      <div className="p-6 pb-0 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-xs px-2.5 py-0.5 bg-[#f3f4f5] border border-[#E5E7EB] text-[#1C1C1C] font-semibold rounded">
              {story.category}
            </span>
            {/* 작성자 닉네임은 노출하지 않는다 — 여러 사연이 같은 닉네임으로 묶이면
                조합만으로 신원이 좁혀지기 때문. 닉네임은 마이페이지에서만 쓴다 */}
            <span className="font-label-sm text-[11px] text-[#5f5e5e]/60">
              {new Date(story.createdAt).toLocaleDateString()}
            </span>
            {isMyStory && (
              <span className="inline-flex items-center gap-1 bg-[#FF6B5A]/10 border border-[#FF6B5A] text-[#FF6B5A] px-2 py-0.5 rounded text-xs font-mono font-medium ml-1 shrink-0">
                <CheckCircle className="w-3.5 h-3.5" />
                내 글
              </span>
            )}
            {story.isAdult && isUserAdultVerified && (
              <span className="flex items-center justify-center w-5 h-5 bg-red-50 border border-red-200 text-red-500 rounded text-[10px] font-black ml-0.5">19</span>
            )}
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              className="text-[#5f5e5e] hover:text-[#1C1C1C] p-1 transition-colors cursor-pointer"
              title="메뉴 더보기"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg border border-[#E5E7EB] z-10 py-1 font-body-sm text-xs">
                {isMyStory && onEdit && (
                  <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onEdit(story.id); }} className="w-full text-left px-4 py-2 hover:bg-[#f3f4f5] text-[#1C1C1C] flex items-center gap-2 cursor-pointer">
                    <Edit2 className="w-3.5 h-3.5" /> 수정
                  </button>
                )}
                {onHide && (
                  <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onHide(story.id); }} className="w-full text-left px-4 py-2 hover:bg-[#f3f4f5] text-[#5f5e5e] flex items-center gap-2 cursor-pointer">
                    <EyeOff className="w-3.5 h-3.5" /> 숨기기
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onReport(story.id); }} className="w-full text-left px-4 py-2 hover:bg-[#f3f4f5] text-[#ba1a1a] flex items-center gap-2 cursor-pointer">
                  <ShieldAlert className="w-3.5 h-3.5" /> 신고
                </button>
                {isMyStory && onDelete && (
                  <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onDelete(story.id); }} className="w-full text-left px-4 py-2 hover:bg-[#f3f4f5] text-[#ba1a1a] flex items-center gap-2 cursor-pointer border-t border-[#E5E7EB]">
                    <Trash2 className="w-3.5 h-3.5" /> 삭제
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Title and Excerpt Body with conditional blur */}
        <div className="relative mb-6">
          <div className={isBlurRequired ? "blur-[6px] select-none pointer-events-none opacity-60 transition-all" : ""}>
            <h4 className="font-headline-md text-base sm:text-lg font-bold text-[#1C1C1C] mb-3 group-hover:text-[#FF6B5A] transition-colors leading-snug">
              {story.title}
            </h4>
            <p className={`text-[#5f5e5e] font-body-sm text-xs sm:text-sm leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
              {story.body}
            </p>
            {story.body.length > 100 && (
              <div className="text-right">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} 
                  className="text-xs text-[#5f5e5e] font-bold mt-1 hover:text-[#1C1C1C]"
                >
                  {isExpanded ? '접기' : '더보기'}
                </button>
              </div>
            )}
          </div>
          
          {/* Adult Content Overlay */}
          {isBlurRequired && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none bg-white/20">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow-sm mb-1.5 border border-red-100">
                <span className="font-black text-xl font-mono">19</span>
              </div>
              <span className="text-[11px] font-bold text-red-500 bg-white/90 px-3 py-1 rounded-full shadow-xs border border-red-100">성인 인증 필요</span>
            </div>
          )}
        </div>

        {/* Live Vote Gauge */}
        <div className="mt-auto pt-2" onClick={(e) => e.stopPropagation()}>
          <IssueSummary mySide={story.issueMySide} yourSide={story.issueYourSide} />

          <VoteResult
            votesA={story.votesA}
            votesB={story.votesB}
            hasVoted={!!votedOption}
            isMyStory={isMyStory}
          />

          {/* Quick Vote Buttons — 왼쪽 니 편(B), 오른쪽 내 편(A) */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isBlurRequired && onRequireAdultVerification) {
                  onRequireAdultVerification();
                  return;
                }
                handleVoteClick(e, 'B');
              }}
              disabled={isBlurRequired || isMyStory || (!!votedOption && !!story.voteChanged)}
              className={`py-2 px-3 rounded-lg font-label-sm text-xs font-bold transition-all ${
                isBlurRequired
                  ? 'bg-[#f3f4f5] text-[#5f5e5e]/30 cursor-not-allowed'
                  : votedOption === 'B'
                  ? 'bg-[#6C7BE8] text-white cursor-default'
                  : isMyStory
                  ? 'bg-[#f3f4f5] text-[#5f5e5e]/50 cursor-not-allowed'
                  : 'bg-[#f3f4f5] text-[#1C1C1C] hover:bg-[#6C7BE8]/20 cursor-pointer'
              }`}
            >
              니 편
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isBlurRequired && onRequireAdultVerification) {
                  onRequireAdultVerification();
                  return;
                }
                handleVoteClick(e, 'A');
              }}
              disabled={isBlurRequired || isMyStory || (!!votedOption && !!story.voteChanged)}
              className={`py-2 px-3 rounded-lg font-label-sm text-xs font-bold transition-all ${
                isBlurRequired
                  ? 'bg-[#f3f4f5] text-[#5f5e5e]/30 cursor-not-allowed'
                  : votedOption === 'A'
                  ? 'bg-[#FF6B5A] text-white cursor-default'
                  : isMyStory
                  ? 'bg-[#f3f4f5] text-[#5f5e5e]/50 cursor-not-allowed'
                  : 'bg-[#f3f4f5] text-[#1C1C1C] hover:bg-[#FF6B5A]/20 cursor-pointer'
              }`}
            >
              내 편
            </button>
          </div>

          {/* 투표 변경 가능 여부 안내 (투표한 사연에만 노출) */}
          {!isMyStory && votedOption && (
            <p className="mt-2 text-[11px] text-[#5f5e5e] text-center">
              {story.voteChanged
                ? '투표가 확정되어 더 이상 바꿀 수 없어요.'
                : '투표는 한 번만 바꿀 수 있어요.'}
            </p>
          )}
        </div>
      </div>

      {/* Card Footer Info */}
      <div className="p-4 px-6 bg-white border-t border-[#E5E7EB] flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/*
            댓글은 '누르는 것', 투표 수는 '읽는 것'이다.

            예전에는 둘 다 회색 아이콘 + 숫자로 똑같이 생겨서, 눌리지 않는 투표
            수를 눌러보는 사람이 생겼다. 댓글 쪽만 테두리를 줘서 버튼으로 보이게
            하고, 투표 수는 테두리 없는 글자로 둔다.
          */}
          <button
            type="button"
            aria-expanded={activeCommentTab !== null}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-label-sm text-xs transition-colors ${
              isBlurRequired
                ? 'border-[#E5E7EB] text-[#5f5e5e]/30 cursor-not-allowed'
                : activeCommentTab !== null
                  ? 'border-[#1C1C1C] text-[#1C1C1C] cursor-pointer'
                  : 'border-[#E5E7EB] text-[#5f5e5e] cursor-pointer hover:border-[#1C1C1C] hover:text-[#1C1C1C]'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (isBlurRequired) {
                if (onRequireAdultVerification) onRequireAdultVerification();
                return;
              }
              setActiveCommentTab(activeCommentTab === null ? 'all' : null);
            }}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">forum</span>
            <span className="sr-only">댓글 </span>{comments.length}
          </button>
          <span className="flex items-center gap-1 text-[#5f5e5e]/70 font-label-sm text-xs">
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">how_to_vote</span>
            <span className="sr-only">투표 </span>{totalVotes}
          </span>
        </div>

        {isMyStory && (
          <span className="text-[11px] text-[#F97316] font-semibold text-right">
            ※ 내가 작성한 사연은 여론 확인만 가능합니다.
          </span>
        )}
      </div>
      
      {/* Unified Top 3 Comments Tabs */}
      {activeCommentTab && (
        <div className="bg-[#f9fafb] p-4 border-t border-[#E5E7EB] space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
            <div className="flex gap-4 text-xs font-bold font-mono">
              <button 
                onClick={() => setActiveCommentTab('all')} 
                className={`pb-2 -mb-[9px] transition-colors ${activeCommentTab === 'all' ? 'text-[#1C1C1C] border-b-2 border-[#1C1C1C]' : 'text-[#5f5e5e] hover:text-[#1C1C1C]'}`}
              >
                전체
              </button>
              <button 
                onClick={() => setActiveCommentTab('A')} 
                className={`pb-2 -mb-[9px] transition-colors ${activeCommentTab === 'A' ? 'text-[#FF6B5A] border-b-2 border-[#FF6B5A]' : 'text-[#5f5e5e] hover:text-[#1C1C1C]'}`}
              >
                내 편
              </button>
              <button 
                onClick={() => setActiveCommentTab('B')} 
                className={`pb-2 -mb-[9px] transition-colors ${activeCommentTab === 'B' ? 'text-[#1C1C1C] border-b-2 border-[#1C1C1C]' : 'text-[#5f5e5e] hover:text-[#1C1C1C]'}`}
              >
                니 편
              </button>
            </div>
            <button onClick={() => setActiveCommentTab(null)} className="text-[#5f5e5e] hover:text-[#1C1C1C]">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
          <div className="space-y-2 pt-1">
            {comments
              .filter((c) => {
                const displayVote = c.authorId === currentUser?.id ? votedOption : c.authorVoted;
                return activeCommentTab === 'all' || displayVote === activeCommentTab;
              })
              .sort((a, b) => b.likeCount - a.likeCount)
              .slice(0, 3)
              .map((c) => {
                const displayVote = c.authorId === currentUser?.id ? votedOption : c.authorVoted;
                return (
                <div key={c.id} className="bg-white border border-[#E5E7EB] p-3 rounded-md space-y-1">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-[#1C1C1C]">{c.anonymousId}</span>
                      {activeCommentTab === 'all' && (
                        c.authorId === story.authorId ? (
                          <span className="bg-[#1C1C1C] text-white px-1.5 py-0.5 rounded text-[8px] font-bold leading-none ml-1">
                            작성자
                          </span>
                        ) : (
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold leading-none ml-1 ${
                            displayVote === 'A' ? 'bg-[#FF6B5A] text-white' : 
                            displayVote === 'B' ? 'bg-[#6C7BE8] text-white' : 
                            'bg-[#9ca3af] text-white'
                          }`}>
                            {displayVote === 'A' ? '내 편' : displayVote === 'B' ? '니 편' : '미투표'}
                          </span>
                        )
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[#5f5e5e]">
                      <Heart className="w-3 h-3" />
                      <span>{c.likeCount}</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#1C1C1C] font-body-sm leading-relaxed line-clamp-2">{c.content}</p>
                </div>
              )})}
          </div>
        </div>
      )}
    </article>
  );
};


