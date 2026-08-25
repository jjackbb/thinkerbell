import React, { useState, useEffect, useRef } from 'react';
import { Story, Comment, UserProfile } from '../types';
import { detectCrisis } from '../lib/crisis';
import { VoteResult } from './VoteResult';
import { ShareResultBar } from './ShareResultBar';
import { X, Send, ShieldAlert, MoreVertical, Edit2, EyeOff, Trash2, MessageCircle, Vote, Heart, Share2, CheckCircle } from 'lucide-react';

interface StoryDetailModalProps {
  story: Story | null;
  comments: Comment[];
  currentUser: UserProfile;
  onClose: () => void;
  onVote: (storyId: string, option: 'A' | 'B') => void;
  onAddComment: (storyId: string, content: string) => void;
  onLikeComment: (commentId: string) => void;
  onStartAIChat: (story: Story) => void;
  /** 오늘 남은 무료 AI 대화 횟수 (내 사연이면 무제한이라 표시하지 않는다) */
  freeChatsLeft?: number;
  onReportStory: (storyId: string) => void;
  onReportComment: (commentId: string) => void;
  onEditStory?: (storyId: string) => void;
  onHideStory?: (storyId: string) => void;
  onDeleteStory?: (storyId: string) => void;
  onEditComment?: (storyId: string, commentId: string, newContent: string) => void;
  onDeleteComment?: (storyId: string, commentId: string) => void;
}

export const StoryDetailModal: React.FC<StoryDetailModalProps> = ({
  story,
  comments,
  currentUser,
  onClose,
  onVote,
  onAddComment,
  onLikeComment,
  onStartAIChat,
  freeChatsLeft,
  onReportStory,
  onReportComment,
  onEditStory,
  onHideStory,
  onDeleteStory,
  onEditComment,
  onDeleteComment,
}) => {
  const [commentText, setCommentText] = useState('');
  const [votedOption, setVotedOption] = useState<'A' | 'B' | null>(story?.userVoted || null);
  const [commentFilter, setCommentFilter] = useState<'all' | 'A' | 'B'>('all');
  const [commentSort, setCommentSort] = useState<'latest' | 'likes'>('latest');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [commentMenuOpenId, setCommentMenuOpenId] = useState<string | null>(null);
  const [showSensitiveBody, setShowSensitiveBody] = useState(false);

  /** 이 사연으로 바로 열리는 주소 */
  const shareUrl = story
    ? `${window.location.origin}${window.location.pathname}?story=${encodeURIComponent(story.id)}`
    : '';

  // 서버에서 내 투표 기록을 불러오면 모달 상태도 따라가야 한다
  useEffect(() => {
    setVotedOption(story?.userVoted ?? null);
  }, [story?.id, story?.userVoted]);

  // 다른 사연으로 바뀌면 민감 안내를 다시 보여준다
  useEffect(() => {
    setShowSensitiveBody(false);
  }, [story?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isMenuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const isMyStory = story ? currentUser.id === story.authorId : false;

  if (!story) return null;

  const isSensitive = detectCrisis(story.body) || detectCrisis(story.title);

  const filteredComments = comments
    .filter(c => {
      const displayVote = c.authorId === currentUser.id ? votedOption : c.authorVoted;
      return commentFilter === 'all' || displayVote === commentFilter;
    })
    .sort((a, b) => {
      if (commentSort === 'likes') return b.likeCount - a.likeCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleVote = (option: 'A' | 'B') => {
    if (isMyStory) {
      showToast('사연 작성자는 투표할 수 없으며, 여론 확인만 가능합니다.');
      return;
    }
    if (votedOption && story.voteChanged) {
      showToast('투표는 최대 1번만 변경할 수 있습니다.');
      return;
    }
    setVotedOption(option);
    onVote(story.id, option);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    let sanitizedComment = commentText.trim();
    try {
      const res = await fetch('/api/sanitize-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentText.trim() })
      });
      const data = await res.json();
      if (data.sanitizedText) {
        // AI가 따옴표로 감싸서 반환하는 경우 방어
        sanitizedComment = data.sanitizedText.replace(/^["']|["']$/g, '');
      }
    } catch (err) {
      console.warn('댓글 비속어 필터 실패, 원문으로 등록:', err);
    }

    onAddComment(story.id, sanitizedComment);
    setCommentText('');
    showToast('논리 분석 댓글이 등록되었습니다.');
  };

  const totalVotes = story.votesA + story.votesB;
  const percentA = totalVotes > 0 ? Math.round((story.votesA / totalVotes) * 100) : 0;
  const percentB = totalVotes > 0 ? 100 - percentA : 0;
  const isZeroVotes = totalVotes === 0;

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div onClick={(e) => e.stopPropagation()} className="bg-[#f8f9fa] text-[#191c1d] rounded-lg w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden relative shadow-2xl border border-[#E5E7EB]">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1C1C1C] text-[#FF6B5A] px-4 py-2 rounded border border-[#FF6B5A]/40 font-mono text-xs font-bold shadow-md">
            {toastMessage}
          </div>
        )}

        {/* Modal Top Bar */}
        <header className="sticky top-0 z-40 bg-[#1C1C1C] text-white flex justify-between items-center px-6 py-4 border-b border-[#1C1C1C]">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="material-symbols-outlined text-[#FF6B5A] text-2xl font-bold">terminal</span>
            <h1 className="font-headline-md text-base font-bold text-[#FF6B5A]">니편내편</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative" ref={menuRef}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }} 
                className="text-[#5f5e5e] hover:text-[#FF6B5A] transition-colors cursor-pointer p-1"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-[#2a2a2a] rounded-md shadow-lg border border-[#3a3a3a] z-50 py-1 font-body-sm text-xs">
                  {isMyStory && onEditStory && (
                    <button onClick={() => { setIsMenuOpen(false); onEditStory(story.id); onClose(); }} className="w-full text-left px-4 py-2 hover:bg-[#3a3a3a] text-white flex items-center gap-2 cursor-pointer">
                      <Edit2 className="w-3.5 h-3.5" /> 수정
                    </button>
                  )}
                  {onHideStory && (
                    <button onClick={() => { setIsMenuOpen(false); onHideStory(story.id); onClose(); }} className="w-full text-left px-4 py-2 hover:bg-[#3a3a3a] text-[#5f5e5e] flex items-center gap-2 cursor-pointer">
                      <EyeOff className="w-3.5 h-3.5" /> 숨기기
                    </button>
                  )}
                  <button onClick={() => { setIsMenuOpen(false); onReportStory(story.id); }} className="w-full text-left px-4 py-2 hover:bg-[#3a3a3a] text-[#ba1a1a] flex items-center gap-2 cursor-pointer">
                    <ShieldAlert className="w-3.5 h-3.5" /> 신고
                  </button>
                  {isMyStory && onDeleteStory && (
                    <button onClick={() => { setIsMenuOpen(false); onDeleteStory(story.id); }} className="w-full text-left px-4 py-2 hover:bg-[#3a3a3a] text-[#ba1a1a] flex items-center gap-2 cursor-pointer border-t border-[#3a3a3a]">
                      <Trash2 className="w-3.5 h-3.5" /> 삭제
                    </button>
                  )}
                </div>
              )}
            </div>
            <button onClick={onClose} className="text-[#5f5e5e] hover:text-white cursor-pointer">
              <X className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Modal Scroll Content */}
        <div className="overflow-y-auto flex-1">
          {/* Hero Section */}
          <section className="story-gradient text-white py-10 px-6 md:px-10 border-b border-[#1C1C1C]">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 bg-[#FF6B5A]/10 border border-[#FF6B5A] text-[#FF6B5A] px-2 py-0.5 rounded text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-[#FF6B5A] animate-pulse"></span>
                {story.category}
              </span>
              {currentUser?.id === story.authorId && (
                <span className="inline-flex items-center gap-1 text-[#FF6B5A] text-xs font-mono font-medium ml-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  내 글
                </span>
              )}
            </div>
            
            <div>
              <div>
                <h2 className="font-display-lg text-xl sm:text-2xl font-bold mb-4 leading-tight">
                  {story.title}
                </h2>
                <div className="flex flex-wrap items-center gap-6 text-[#5f5e5e] font-mono text-xs">
                  <span>{new Date(story.createdAt).toLocaleDateString()}</span>
                  <span>{story.viewCount} Views</span>
                  <span>{comments.length} Comments</span>
                </div>
              </div>
            </div>
          </section>

          {/* Main Layout Grid */}
          <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8">
            {/* Left Story Body & Vote */}
            <div className="flex-1 space-y-8">
              {/* 위기 표현이 담긴 사연은 본문보다 먼저 안내를 보여준다.
                  자살 관련 보도에서 기사 앞에 주의 문구를 두는 방식과 같다 */}
              {isSensitive && !showSensitiveBody ? (
                <article className="rounded-xl border border-[#E5E7EB] bg-[#f9fafb] p-6 text-center">
                  <p className="text-sm font-bold text-[#1C1C1C] mb-2">
                    힘든 마음이 담긴 사연이에요
                  </p>
                  <p className="text-xs text-[#5f5e5e] leading-relaxed mb-4">
                    읽는 것만으로 마음이 무거워질 수 있어요.
                    지금 나도 힘들다면 <span className="font-bold text-[#1C1C1C]">자살예방상담전화 109</span>에서
                    24시간 익명으로 이야기할 수 있습니다.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <button
                      onClick={() => setShowSensitiveBody(true)}
                      className="px-4 py-2 rounded-lg bg-[#1C1C1C] text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer"
                    >
                      사연 보기
                    </button>
                    <a
                      href="tel:109"
                      className="px-4 py-2 rounded-lg bg-[#FF6B5A] text-white text-xs font-bold hover:bg-[#e85a4a] transition-colors"
                    >
                      109 연결하기
                    </a>
                  </div>
                </article>
              ) : (
                <article className="prose max-w-none">
                  <p className="font-body-lg text-sm sm:text-base text-[#191c1d] leading-relaxed whitespace-pre-line">
                    {story.body}
                  </p>
                </article>
              )}

              {/* Voting Section */}
              <div className="space-y-4 pt-4 border-t border-[#E5E7EB]">
                {/* Live Vote Gauge */}

                <VoteResult
                  votesA={story.votesA}
                  votesB={story.votesB}
                  hasVoted={!!votedOption}
                  isMyStory={isMyStory}
                />

                {/* 사연 피드 카드와 동일한 투표 버튼 — 왼쪽 니 편(B), 오른쪽 내 편(A) */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleVote('B')}
                    disabled={isMyStory || (!!votedOption && !!story.voteChanged)}
                    className={`py-2 px-3 rounded-lg font-label-sm text-xs font-bold transition-all ${
                      votedOption === 'B'
                        ? 'bg-[#6C7BE8] text-white cursor-default'
                        : isMyStory
                        ? 'bg-[#f3f4f5] text-[#5f5e5e]/50 cursor-not-allowed'
                        : 'bg-[#f3f4f5] text-[#1C1C1C] hover:bg-[#6C7BE8]/20 cursor-pointer'
                    }`}
                  >
                    니 편
                  </button>
                  <button
                    onClick={() => handleVote('A')}
                    disabled={isMyStory || (!!votedOption && !!story.voteChanged)}
                    className={`py-2 px-3 rounded-lg font-label-sm text-xs font-bold transition-all ${
                      votedOption === 'A'
                        ? 'bg-[#FF6B5A] text-white cursor-default'
                        : isMyStory
                        ? 'bg-[#f3f4f5] text-[#5f5e5e]/50 cursor-not-allowed'
                        : 'bg-[#f3f4f5] text-[#1C1C1C] hover:bg-[#FF6B5A]/20 cursor-pointer'
                    }`}
                  >
                    내 편
                  </button>
                </div>

                {isMyStory && (
                  <p className="text-xs text-[#F97316] text-center font-semibold mt-1">
                    ※ 내가 작성한 사연은 여론 확인만 가능합니다.
                  </p>
                )}

                {/* 투표 변경 가능 여부 안내 (투표한 경우에만 노출) */}
                {!isMyStory && votedOption && (
                  <p className="text-[11px] text-[#5f5e5e] text-center">
                    {story.voteChanged
                      ? '투표가 확정되어 더 이상 바꿀 수 없어요.'
                      : '투표는 한 번만 바꿀 수 있어요.'}
                  </p>
                )}
              </div>

              {/* AI 대화 CTA.
                  사연을 읽고 편을 고른 다음에 권해야 맥락이 맞다. 예전에는 제목
                  바로 아래(히어로)에 있어서, 읽으러 온 사람에게 읽기도 전에 다른
                  걸 먼저 권하는 꼴이었다. */}
              <div className="pt-4 border-t border-[#E5E7EB]">
                <div className="p-4 sm:p-5 bg-[#1C1C1C] text-white rounded-xl flex items-center justify-between gap-4 border border-[#1C1C1C]">
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-[#FF6B5A]">AI로 이 상황을 다시 겪어보기</h4>
                    <p className="text-xs text-[#5f5e5e] mt-1 leading-relaxed">
                      {isMyStory
                        ? '사연 속 상대방과 직접 대화해 보세요. 내 사연은 횟수 제한이 없어요.'
                        : '사연 속 상대방과 직접 대화해 보세요.'}
                    </p>
                    {!isMyStory && typeof freeChatsLeft === 'number' && (
                      <p className="text-[11px] font-mono text-[#5f5e5e] mt-1.5">
                        {freeChatsLeft > 0
                          ? `오늘 무료로 ${freeChatsLeft}번 더 열 수 있어요`
                          : '오늘 무료 횟수를 다 썼어요 · 내일 다시 충전돼요'}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onStartAIChat(story)}
                    className="px-4 py-2.5 bg-[#FF6B5A] text-[#1C1C1C] font-bold text-xs sm:text-sm rounded-lg hover:bg-[#FF6B5A]/90 cursor-pointer shrink-0 transition-all"
                  >
                    시작하기
                  </button>
                </div>
              </div>

            </div>

            {/* Right Comments */}
            <aside className="w-full lg:w-80 space-y-6">
              {/* Comments Feed */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-[#5f5e5e] font-label-sm text-xs">
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">forum</span> {filteredComments.length}
                    </span>
                    <span className="flex items-center gap-1 text-[#5f5e5e] font-label-sm text-xs">
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">how_to_vote</span> {totalVotes}
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs font-mono">
                    <select value={commentFilter} onChange={(e) => setCommentFilter(e.target.value as 'all' | 'A' | 'B')} className="bg-transparent border-none outline-none text-[#5f5e5e] cursor-pointer">
                      <option value="all">전체</option>
                      <option value="B">니 편</option>
                      <option value="A">내 편</option>
                    </select>
                    <select value={commentSort} onChange={(e) => setCommentSort(e.target.value as 'latest' | 'likes')} className="bg-transparent border-none outline-none text-[#5f5e5e] cursor-pointer">
                      <option value="latest">최신순</option>
                      <option value="likes">좋아요 순</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredComments.map((c) => {
                    const displayVote = c.authorId === currentUser.id ? votedOption : c.authorVoted;
                    return (
                    <div key={c.id} className="bg-white border border-[#E5E7EB] p-4 rounded-lg space-y-2">
                      <div className="flex items-center justify-between font-mono text-xs">
                        <div className="flex items-center flex-wrap gap-1">
                          <span className="font-bold text-[#1C1C1C]">{c.anonymousId}</span>
                          {c.authorId === story.authorId ? (
                            <span className="bg-[#1C1C1C] text-white px-1.5 py-0.5 rounded text-[10px] font-normal leading-none ml-1">
                              작성자
                            </span>
                          ) : (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ml-1 ${
                              displayVote === 'A' ? 'bg-[#FF6B5A] text-white' : 
                              displayVote === 'B' ? 'bg-[#6C7BE8] text-white' : 
                              'bg-[#9ca3af] text-white'
                            }`}>
                              {displayVote === 'A' ? '내 편' : displayVote === 'B' ? '니 편' : '미투표'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <button onClick={() => onLikeComment(c.id)} className="flex items-center gap-1 text-[#5f5e5e] hover:text-[#FF6B5A]">
                            <Heart className={`w-3.5 h-3.5 ${c.userLiked ? 'fill-[#FF6B5A] text-[#FF6B5A]' : ''}`} />
                            <span>{c.likeCount}</span>
                          </button>
                          {c.authorId === currentUser.id ? (
                            <div className="relative">
                              <button onClick={() => setCommentMenuOpenId(commentMenuOpenId === c.id ? null : c.id)} className="text-[#5f5e5e] hover:text-[#1C1C1C] p-0.5 rounded cursor-pointer">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {commentMenuOpenId === c.id && (
                                <div className="absolute right-0 mt-1 w-20 bg-white border border-[#E5E7EB] rounded-lg shadow-lg py-1 z-10 text-xs overflow-hidden">
                                  <button onClick={() => { setEditingCommentId(c.id); setEditingCommentText(c.content); setCommentMenuOpenId(null); }} className="w-full text-left px-3 py-2 hover:bg-[#f9fafb] text-[#1C1C1C] cursor-pointer">수정</button>
                                  <button onClick={() => { onDeleteComment?.(story.id, c.id); setCommentMenuOpenId(null); }} className="w-full text-left px-3 py-2 hover:bg-[#f9fafb] text-red-500 cursor-pointer">삭제</button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <button onClick={() => onReportComment(c.id)} className="text-[#5f5e5e] hover:text-red-500 p-0.5 rounded cursor-pointer" title="신고">
                              <ShieldAlert className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      {editingCommentId === c.id ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            className="w-full p-2 text-xs border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#FF6B5A] resize-none"
                            rows={2}
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingCommentId(null)} className="px-3 py-1.5 text-xs text-[#5f5e5e] hover:bg-[#f3f4f5] rounded-md cursor-pointer font-bold">취소</button>
                            <button onClick={() => { if(editingCommentText.trim()) { onEditComment?.(story.id, c.id, editingCommentText.trim()); setEditingCommentId(null); } }} className="px-3 py-1.5 text-xs bg-[#1C1C1C] text-white rounded-md cursor-pointer font-bold">완료</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <p className="text-xs text-[#1C1C1C] font-body-sm leading-relaxed whitespace-pre-wrap">
                            {c.content}
                          </p>
                          {c.isEdited && (
                            <span className="text-[10px] text-[#9ca3af] text-right mr-1">(수정됨)</span>
                          )}
                        </div>
                      )}
                    </div>
                  )})}
                </div>

                {/* Add Comment Input */}
                <form onSubmit={handleCommentSubmit} className="relative mt-4 bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="댓글을 달아주세요"
                    rows={3}
                    maxLength={200}
                    className="w-full p-3 font-body-sm text-xs focus:outline-none resize-none border-b border-[#E5E7EB]"
                  />
                  <div className="flex items-center justify-between p-2 px-3 bg-[#f9fafb]">
                    {/* 익명은 선택이 아니라 유일한 방식이다. 체크박스를 두면 실수로
                        닉네임이 노출되고, 사연에서 닉네임을 감춘 의미도 사라진다 */}
                    <span className="text-xs font-mono text-[#5f5e5e]">
                      {isMyStory ? '글쓴이로 표시됩니다' : '익명으로 등록됩니다'}
                    </span>
                    <button
                      type="submit"
                      className="bg-[#1C1C1C] text-[#FF6B5A] px-3 py-1.5 font-mono text-xs font-bold rounded hover:bg-black transition-colors"
                    >
                      입력
                    </button>
                  </div>
                </form>
              </div>
            </aside>
          </div>
        </div>

        {/* 결과를 본 사람에게만 공유를 연다. 투표 전에는 결과 자체가 가려져 있으므로
            공유 버튼이 먼저 나오면 그 가림이 무의미해진다 */}
        {(!!votedOption || isMyStory) && (
          <ShareResultBar
            input={{
              title: story.title,
              votesA: story.votesA,
              votesB: story.votesB,
              myChoice: votedOption,
            }}
            url={shareUrl}
          />
        )}
      </div>
    </div>
  );
};


