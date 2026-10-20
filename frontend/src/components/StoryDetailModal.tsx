import { groupCommentThreads, replyTargetLabel } from '../lib/commentThreads';
import { ownsStory } from '../lib/storyOwnership';
import { beginTask, blockedAction } from '../lib/taskAnalytics';
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Story, Comment, UserProfile } from '../types';
import { detectCrisis } from '../lib/crisis';
import { VoteResult } from './VoteResult';
import { SideVoteLabel } from './SideVoteLabel';
import { ShareResultBar } from './ShareResultBar';
import { renderShareCard, ShareCardInput } from '../lib/shareCard';
import { X, Send, ShieldAlert, MoreVertical, Edit2, EyeOff, Trash2, MessageCircle, Vote, Heart, Share2, CheckCircle, ImageDown } from 'lucide-react';

interface StoryDetailModalProps {
  story: Story | null;
  repliesEnabled?: boolean;
  focusCommentId?: string | null;
  interactionPaused?: boolean;
  suspended?: boolean;
  comments: Comment[];
  currentUser: UserProfile;
  onClose: () => void;
  onVote: (storyId: string, option: 'A' | 'B') => Promise<boolean>;
  onAddComment: (storyId: string, content: string, commentId: string, replyToId?: string) => Promise<boolean>;
  onLikeComment: (commentId: string) => void;
  likePendingIds?: string[];
  onStartAIChat: (story: Story) => void;
  /** 오늘 남은 무료 AI 대화 횟수 (내 사연이면 무제한이라 표시하지 않는다) */
  freeChatsLeft?: number;
  /** 남은 횟수를 서버에서 확인하지 못했다. "다 썼어요"로 잘못 안내하지 않는다 */
  aiQuotaUnknown?: boolean;

  /**
   * 로그인 없이 둘러보는 중인가.
   *
   * 게스트는 AI가 먼저 거는 첫 마디까지만 보고 답장은 못 한다.
   * 무료 횟수도 쓰지 않으므로 남은 횟수 안내가 오히려 거짓말이 된다.
   */
  isGuest?: boolean;

  /** 로그인이 필요한 자리에서 부른다. 안내는 앱이 한 곳에서 띄운다 */
  onRequireLogin?: (message: string) => void;
  onReportStory: (storyId: string) => void;
  onReportComment: (commentId: string) => void;
  onEditStory?: (storyId: string) => void;
  onHideStory?: (storyId: string) => Promise<boolean>;
  onSetVisibility?: (storyId: string, visibility: 'public' | 'private') => Promise<boolean>;
  onDeleteStory?: (storyId: string) => void;
  onEditComment?: (storyId: string, commentId: string, newContent: string) => Promise<boolean>;
  onDeleteComment?: (storyId: string, commentId: string) => Promise<boolean>;
}

export const StoryDetailModal: React.FC<StoryDetailModalProps> = ({
  story,
  repliesEnabled = false,
  focusCommentId = null,
  interactionPaused = false,
  suspended = false,
  comments,
  currentUser,
  onClose,
  onVote,
  onAddComment,
  onLikeComment,
  likePendingIds = [],
  onStartAIChat,
  freeChatsLeft,
  aiQuotaUnknown = false,
  isGuest = false,
  onRequireLogin,
  onReportStory,
  onReportComment,
  onEditStory,
  onHideStory,
  onSetVisibility,
  onDeleteStory,
  onEditComment,
  onDeleteComment,
}) => {
  const scrollContentRef = useRef<HTMLDivElement>(null);
  /*
    본문 제목이 위로 완전히 지나가면 상단 바의 '사연' 자리에 제목을 띄운다.
    아래로 내려 읽는 중에도 어떤 사연인지 알 수 있게 한다.
  */
  const storyTitleRef = useRef<HTMLHeadingElement>(null);
  const [titlePassed, setTitlePassed] = useState(false);
  useEffect(() => {
    const target = storyTitleRef.current;
    const root = scrollContentRef.current;
    setTitlePassed(false);
    if (!target || !root || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      // 제목의 아래쪽 끝까지 화면 위로 넘어갔을 때만 바꾼다(아래쪽으로 벗어난 경우는 제외)
      setTitlePassed(!entry.isIntersecting && entry.boundingClientRect.bottom <= (entry.rootBounds?.top ?? 0));
    }, { root, threshold: 0 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [story?.id]);
  const scrollPosition = useRef(0);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const wasSuspended = useRef(false);
  useLayoutEffect(() => {
    if (!story) return;
    if (!suspended && wasSuspended.current) {
      if (scrollContentRef.current) scrollContentRef.current.scrollTop = scrollPosition.current;
      returnFocus.current?.focus({ preventScroll: true });
    }
    wasSuspended.current = suspended;
  }, [suspended, story?.id]);
  const [commentText, setCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const focusedNotification = useRef<string | null>(null);
  const commentSubmittingRef = useRef(false);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const commentRequestRef = useRef<{ sourceText: string; targetId?: string; id: string } | null>(null);
  const currentStoryIdRef = useRef(story?.id);
  currentStoryIdRef.current = story?.id;
  const [votedOption, setVotedOption] = useState<'A' | 'B' | null>(story?.userVoted || null);
  const [isVoteSubmitting, setIsVoteSubmitting] = useState(false);
  const voteSubmittingRef = useRef(false);
  const [commentFilter, setCommentFilter] = useState<'all' | 'A' | 'B'>('all');
  const [commentSort, setCommentSort] = useState<'latest' | 'likes'>('latest');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisibilitySaving, setIsVisibilitySaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [commentMenuOpenId, setCommentMenuOpenId] = useState<string | null>(null);
  const [commentMutationId, setCommentMutationId] = useState<string | null>(null);
  const [showSensitiveBody, setShowSensitiveBody] = useState(false);

  /** 공유 카드 미리보기 이미지. 열려 있는 동안만 들고 있는다 */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  /* 카드 그리는 데 70ms 안팎이라 화면에 로딩 표시는 두지 않는다 —
     그 짧은 시간에 표시가 깜빡이면 오히려 어수선하다. 연타만 막는 용도다 */
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const closePreview = () => setPreviewUrl(null);

  /** 이 사연으로 바로 열리는 주소 */
  const shareUrl = story
    ? `${window.location.origin}${window.location.pathname}?story=${encodeURIComponent(story.id)}`
    : '';

  // 서버에서 내 투표 기록을 불러오면 모달 상태도 따라가야 한다
  useEffect(() => {
    setVotedOption(story?.userVoted ?? null);
  }, [story?.id, story?.userVoted]);

  /*
    다른 사연으로 넘어가면 앞 사연에 딸린 것들을 비운다.

    특히 댓글 초안(commentText)이 중요하다. 모달은 사연이 바뀌어도
    다시 만들어지지 않아서, 비우지 않으면 A 사연에 쓰다 만 글이 B 사연
    입력창에 그대로 따라간다. 익명 서비스에서 엉뚱한 사연에 등록되면
    되돌릴 수 없다.
  */
  useEffect(() => {
    setShowSensitiveBody(false);
    setCommentText('');
    setReplyTarget(null);
    setExpandedThreads(new Set());
    focusedNotification.current = null;
    commentRequestRef.current = null;
    setEditingCommentId(null);
    setCommentMenuOpenId(null);
    setIsMenuOpen(false);
  }, [story?.id, currentUser.id, isGuest]);

  useEffect(() => {
    if (!focusCommentId || suspended || focusedNotification.current === focusCommentId) return;
    const target = comments.find(c => c.id === focusCommentId);
    if (!target) return;
    setCommentFilter('all');
    if (target.replyRootId) setExpandedThreads(previous => new Set([...previous, target.replyRootId!]));
    const frame = window.requestAnimationFrame(() => {
      const element = document.getElementById(`comment-${focusCommentId}`);
      if (element) focusedNotification.current = focusCommentId;
      element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      element?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusCommentId, story?.id, suspended, comments.length]);

  // 미리보기를 닫거나 모달이 사라지면 만들어 둔 이미지 주소를 놓아준다.
  // 안 그러면 카드를 열어볼 때마다 메모리에 그대로 쌓인다
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  /**
   * ESC로 닫는다. 바깥을 눌러 닫는 길밖에 없으면 키보드만 쓰는 사람은
   * 모달에서 빠져나갈 방법이 없다.
   *
   * 안쪽에 열린 것부터 하나씩 닫는다 — 미리보기 → 열려 있는 메뉴 →
   * 댓글 수정 → 모달. 한 번에 모달까지 닫아 버리면 방금 연 메뉴 때문에
   * 실수로 사연을 벗어나게 된다.
   *
   * 글을 쓰고 있을 때는 ESC를 무시한다. 댓글을 쓰다 무심코 누르면 읽던
   * 자리와 주소를 통째로 잃는데, 그건 닫으려던 게 아니다. 정말 닫고
   * 싶으면 입력창 밖을 한 번 누르고 다시 누르면 된다.
   */
  useEffect(() => {
    if (!story || interactionPaused) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      const el = e.target as HTMLElement | null;
      const typing =
        el?.tagName === 'INPUT' ||
        el?.tagName === 'TEXTAREA' ||
        el?.isContentEditable === true;
      // 미리보기는 글쓰기보다 위에 떠 있으므로 입력 중이어도 먼저 닫는다
      if (previewUrl) { closePreview(); return; }
      if (typing) return;
      if (isMenuOpen) { setIsMenuOpen(false); return; }
      if (commentMenuOpenId) { setCommentMenuOpenId(null); return; }
      if (editingCommentId) { setEditingCommentId(null); return; }
      onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [story, previewUrl, isMenuOpen, commentMenuOpenId, editingCommentId, onClose, interactionPaused]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isMenuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const isMyStory = !!story && ownsStory(currentUser.id, story.authorId, isGuest);

  if (!story) return null;
  const isPrivate = story.visibility === 'private';

  const isSensitive = detectCrisis(story.body) || detectCrisis(story.title);

  const threads = groupCommentThreads(comments, commentFilter, commentSort, currentUser.id, votedOption);
  const filteredComments = repliesEnabled ? threads.flatMap(group => {
    const root: Comment = group.root ?? { id: group.id, storyId: story.id, authorId: '', anonymousId: '', content: '', createdAt: '', likeCount: 0, reportsCount: 0, deletedAt: 'missing' };
    return expandedThreads.has(group.id) ? [root, ...group.replies] : [root];
  }) : comments.filter(c => !c.isBlind).filter(c => commentFilter === 'all' || (c.authorId === currentUser.id ? votedOption : c.authorVoted) === commentFilter).sort((a, b) => commentSort === 'likes' ? b.likeCount - a.likeCount : Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const replyTargetUnavailable = !!replyTarget && !comments.some(c => c.id === replyTarget.id && !c.deletedAt && !c.isBlind);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  /** 공유 바와 미리보기가 같은 값을 그려야 한다 */
  const shareInput: ShareCardInput = {
    title: story.title,
    votesA: story.votesA,
    votesB: story.votesB,
    myChoice: votedOption,
  };

  // 공유하기 전에 무엇이 나가는지 눈으로 확인시켜 준다. 익명 서비스라
  // "내 닉네임이 같이 나가나?"를 확인할 방법이 필요하다
  const handlePreview = async () => {
    if (isPreviewLoading) { blockedAction('share_preview', 'busy'); return; }
    setIsPreviewLoading(true);
    const task = beginTask('share_preview');
    try {
      const blob = await renderShareCard(shareInput);
      if (!blob) {
        task.finish('error');
        showToast('미리보기를 만들지 못했어요.');
        return;
      }
      task.finish('success');
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      task.finish('error');
      showToast('미리보기를 만들지 못했어요.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // 미리보기에서 본 바로 그 카드를 저장한다. 다시 그리지 않으므로 본 것과 저장되는 것이 같다
  const handleSavePreview = () => {
    if (!previewUrl) return;
    const task = beginTask('share_download');
    try {
      const a = document.createElement('a');
      a.href = previewUrl;
      a.download = '니편내편-투표결과.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      task.finish('success');
      closePreview();
      showToast('이미지를 저장했어요.');
    } catch {
      task.finish('error');
      showToast('이미지를 저장하지 못했어요.');
    }
  };

  const handleVote = async (option: 'A' | 'B') => {
    if (isPrivate) return;
    if (voteSubmittingRef.current || votedOption === option) { blockedAction('vote', voteSubmittingRef.current ? 'busy' : 'unchanged'); return; }
    if (isMyStory) {
      blockedAction('vote', 'limit');
      showToast('사연 작성자는 투표할 수 없으며, 여론 확인만 가능합니다.');
      return;
    }
    if (votedOption && story.voteChanged) {
      blockedAction('vote', 'limit');
      showToast('투표는 최대 1번만 변경할 수 있습니다.');
      return;
    }
    voteSubmittingRef.current = true;
    setIsVoteSubmitting(true);
    try {
      await onVote(story.id, option);
    } finally {
      voteSubmittingRef.current = false;
      setIsVoteSubmitting(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPrivate) return;
    if (!commentText.trim() || commentSubmittingRef.current || !story || replyTargetUnavailable) return;
    if (isGuest) { onRequireLogin?.('답글을 남기려면 로그인이 필요해요.'); return; }
    commentSubmittingRef.current = true;

    setIsCommentSubmitting(true);
    try {
      const sourceText = commentText.trim();
      if (commentRequestRef.current?.sourceText !== sourceText || commentRequestRef.current?.targetId !== replyTarget?.id) {
        commentRequestRef.current = { sourceText, targetId: replyTarget?.id, id: `comment-${crypto.randomUUID()}` };
      }
      const targetStoryId = story.id;
      const saved = await onAddComment(targetStoryId, sourceText, commentRequestRef.current.id, replyTarget?.id);
      if (currentStoryIdRef.current !== targetStoryId) return;
      if (!saved) {
        showToast('댓글을 검사·저장하지 못했습니다. 입력을 유지했으니 다시 시도해 주세요.');
        return;
      }
      setCommentText('');
      if (replyTarget) setExpandedThreads(previous => new Set([...previous, replyTarget.replyRootId || replyTarget.id]));
      setReplyTarget(null);
      commentRequestRef.current = null;
      showToast('댓글이 등록되었습니다.');
    } catch {
      if (currentStoryIdRef.current === story.id) {
        showToast('댓글을 등록하지 못했습니다. 입력을 유지했으니 다시 시도해 주세요.');
      }
    } finally {
      commentSubmittingRef.current = false;
      setIsCommentSubmitting(false);
    }
  };

  const totalVotes = story.votesA + story.votesB;
  const percentA = totalVotes > 0 ? Math.round((story.votesA / totalVotes) * 100) : 0;
  const percentB = totalVotes > 0 ? 100 - percentA : 0;
  const isZeroVotes = totalVotes === 0;

  return (
    <div style={suspended ? { display: 'none' } : undefined} inert={suspended} aria-hidden={suspended || undefined} data-analytics-screen={isPrivate || isSensitive || story.isAdult || story.isBlind || story.isHidden ? "excluded" : "story_detail"} data-analytics-layer="20" data-action-id="story-detail-modal-action-01" onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div data-analytics-ignore="true" onClick={(e) => e.stopPropagation()} className="bg-[#f8f9fa] text-[#191c1d] rounded-lg w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden relative shadow-2xl border border-[#E5E7EB]">
        {/* Toast Alert */}
        {toastMessage && (
          <div role="status" className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1C1C1C] text-[#FF6B5A] px-4 py-2 rounded border border-[#FF6B5A]/40 font-mono text-xs font-bold shadow-md">
            {toastMessage}
          </div>
        )}

        {/* Modal Top Bar */}
        <header className="sticky top-0 z-40 bg-[#1C1C1C] text-white flex justify-between items-center px-6 py-4 border-b border-[#1C1C1C]">
          {/* 앱 로고 대신 모달 제목을 둔다. 로고는 눌릴 것처럼 생겼지만
              모달 안에서 홈으로 갈 일이 없어 붙일 동작이 없었다 */}
          <h2 className="font-headline-md text-base font-bold text-white min-w-0 truncate mr-3" title={titlePassed ? story.title : undefined}>
            {titlePassed ? story.title : '사연'}
          </h2>
          <div className="flex items-center gap-3">
            <div className="relative" ref={menuRef}>
              <button data-button-id="story-detail-modal-button-01" aria-label="사연 메뉴 더보기" aria-expanded={isMenuOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }} 
                className="text-[var(--color-secondary-on-dark)] hover:text-[#FF6B5A] transition-colors cursor-pointer p-2.5"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-[#2a2a2a] rounded-md shadow-lg border border-[#3a3a3a] z-50 py-1 font-body-sm text-xs">
                  {isMyStory && onEditStory && (
                    <button data-button-id="story-detail-modal-button-02" onClick={() => { setIsMenuOpen(false); onEditStory(story.id); onClose(); }} className="w-full text-left px-4 py-2 hover:bg-[#3a3a3a] text-white flex items-center gap-2 cursor-pointer">
                      <Edit2 className="w-3.5 h-3.5" /> 수정
                    </button>
                  )}
                  {isMyStory && onSetVisibility && (
                    <button data-analytics-exclude="true" data-button-id="story-detail-modal-button-03" disabled={isVisibilitySaving} onClick={async () => {
                      const next = isPrivate ? 'public' : 'private';
                      if (next === 'private' && !window.confirm(
                        '사연을 비공개로 옮길까요? 다른 이용자는 원문과 댓글을 볼 수 없지만, 이미 만든 다른 사람의 AI 대화에는 사연 내용이 남아 있을 수 있습니다.'
                      )) return;
                      setIsVisibilitySaving(true);
                      try {
                        if (await onSetVisibility(story.id, next)) setIsMenuOpen(false);
                        else showToast('공개 상태를 바꾸지 못했습니다. 다시 시도해 주세요.');
                      } finally { setIsVisibilitySaving(false); }
                    }} className="w-full text-left px-4 py-2 hover:bg-[#3a3a3a] text-white flex items-center gap-2 cursor-pointer disabled:opacity-50">
                      <EyeOff className="w-3.5 h-3.5" /> {isPrivate ? '다시 공개' : '나만 보기'}
                    </button>
                  )}
                  {onHideStory && (
                    <button data-analytics-exclude="true" data-button-id="story-detail-modal-button-04" onClick={async () => { setIsMenuOpen(false); if (await onHideStory(story.id)) onClose(); }} className="w-full text-left px-4 py-2 hover:bg-[#3a3a3a] text-[var(--color-secondary-on-dark)] flex items-center gap-2 cursor-pointer">
                      <EyeOff className="w-3.5 h-3.5" /> 숨기기
                    </button>
                  )}
                  {!isPrivate && <button data-analytics-exclude="true" data-button-id="story-detail-modal-button-05" onClick={() => { setIsMenuOpen(false); onReportStory(story.id); }} className="w-full text-left px-4 py-2 hover:bg-[#3a3a3a] text-[var(--color-danger-on-dark)] flex items-center gap-2 cursor-pointer">
                    <ShieldAlert className="w-3.5 h-3.5" /> 신고
                  </button>}
                  {isMyStory && onDeleteStory && (
                    <button data-analytics-exclude="true" data-button-id="story-detail-modal-button-06" onClick={() => { setIsMenuOpen(false); onDeleteStory(story.id); }} className="w-full text-left px-4 py-2 hover:bg-[#3a3a3a] text-[var(--color-danger-on-dark)] flex items-center gap-2 cursor-pointer border-t border-[#3a3a3a]">
                      <Trash2 className="w-3.5 h-3.5" /> 삭제
                    </button>
                  )}
                </div>
              )}
            </div>
            <button data-button-id="story-detail-modal-button-07" aria-label="사연 닫기" onClick={onClose} className="text-[var(--color-secondary-on-dark)] hover:text-white cursor-pointer p-2">
              <X className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Modal Scroll Content */}
        <div ref={scrollContentRef} onScroll={event => { if (!suspended) scrollPosition.current = event.currentTarget.scrollTop; }} className="overflow-y-auto flex-1">
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
              {isPrivate && isMyStory && <span className="rounded border border-white/30 px-2 py-0.5 text-xs text-white">나만 보기</span>}
            </div>
            
            <div>
              <div>
                <h2 ref={storyTitleRef} className="font-display-lg text-xl sm:text-2xl font-bold mb-4 leading-tight">
                  {story.title}
                </h2>
                <div className="flex flex-wrap items-center gap-6 text-[var(--color-secondary-on-dark)] font-mono text-xs">
                  <span>{new Date(story.createdAt).toLocaleDateString()}</span>
                  <span>조회 {story.viewCount}</span>
                  <span>댓글 {comments.length}</span>
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
                    <button data-analytics-exclude="true" data-button-id="story-detail-modal-button-08"
                      onClick={() => setShowSensitiveBody(true)}
                      className="px-4 py-2 rounded-lg bg-[#1C1C1C] text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer"
                    >
                      사연 보기
                    </button>
                    <a data-analytics-exclude="true" data-action-id="story-detail-modal-action-02"
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
                  <button data-button-id="story-detail-modal-button-09"
                    onClick={() => handleVote('B')}
                    disabled={isPrivate || isMyStory || isVoteSubmitting || (!!votedOption && !!story.voteChanged)}
                    aria-busy={isVoteSubmitting}
                    className={`py-2 px-3 rounded-lg font-label-sm text-xs font-bold transition-all ${
                      votedOption === 'B'
                        ? 'bg-[var(--color-your-side-ink)] text-white cursor-default'
                        : isMyStory
                        ? 'bg-[#f3f4f5] text-[#5f5e5e]/50 cursor-not-allowed'
                        : 'bg-[#f3f4f5] text-[#1C1C1C] hover:bg-[#6C7BE8]/20 cursor-pointer'
                    }`}
                  >
                    <SideVoteLabel side="니 편" role={story.sideLabelB} />
                  </button>
                  <button data-button-id="story-detail-modal-button-10"
                    onClick={() => handleVote('A')}
                    disabled={isPrivate || isMyStory || isVoteSubmitting || (!!votedOption && !!story.voteChanged)}
                    aria-busy={isVoteSubmitting}
                    className={`py-2 px-3 rounded-lg font-label-sm text-xs font-bold transition-all ${
                      votedOption === 'A'
                        ? 'bg-[#FF6B5A] text-[#1C1C1C] cursor-default'
                        : isMyStory
                        ? 'bg-[#f3f4f5] text-[#5f5e5e]/50 cursor-not-allowed'
                        : 'bg-[#f3f4f5] text-[#1C1C1C] hover:bg-[#FF6B5A]/20 cursor-pointer'
                    }`}
                  >
                    <SideVoteLabel side="내 편" role={story.sideLabelA} />
                  </button>
                </div>

                {!isPrivate && !isMyStory && !votedOption && (
                  <p className="text-xs text-[#5f5e5e] text-center">투표한 뒤 화면 아래의 ‘결과 공유하기’를 이용할 수 있어요.</p>
                )}

                {isMyStory && (
                  <p className="text-xs text-[#F97316] text-center font-semibold mt-1">
                    ※ 내가 작성한 사연은 여론 확인만 가능합니다.
                  </p>
                )}

                {/* 투표 변경 가능 여부 안내 (투표한 경우에만 노출) */}
                {!isMyStory && votedOption && (
                  <p className="text-xs text-[#5f5e5e] text-center">
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
                    <p className="text-xs text-[var(--color-secondary-on-dark)] mt-1 leading-relaxed">
                      {isMyStory
                        ? '사연 속 상대방과 직접 대화해 보세요. 내 사연은 횟수 제한이 없어요.'
                        : '사연 속 상대방과 직접 대화해 보세요.'}
                    </p>
                    {isGuest ? (
                      <p className="text-xs font-mono text-[var(--color-secondary-on-dark)] mt-1.5">
                        상대방이 먼저 말을 걸어요 · 답장하려면 로그인이 필요해요
                      </p>
                    ) : (
                      !isMyStory && typeof freeChatsLeft === 'number' && (
                        <p className="text-xs font-mono text-[var(--color-secondary-on-dark)] mt-1.5">
                          {aiQuotaUnknown
                            ? '지금은 남은 횟수를 확인할 수 없어요'
                            : freeChatsLeft > 0
                            ? `오늘 무료로 ${freeChatsLeft}번 더 열 수 있어요`
                            : '오늘 무료 횟수를 다 썼어요 · 내일 다시 충전돼요'}
                        </p>
                      )
                    )}
                  </div>
                  <button data-button-id="story-detail-modal-button-11"
                    onClick={event => {
                      returnFocus.current = event.currentTarget;
                      scrollPosition.current = scrollContentRef.current?.scrollTop ?? 0;
                      onStartAIChat(story);
                    }}
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
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">forum</span> {comments.filter(c => !c.isBlind && !c.deletedAt).length}
                    </span>
                    <span className="flex items-center gap-1 text-[#5f5e5e] font-label-sm text-xs">
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">how_to_vote</span> {totalVotes}
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs font-mono">
                    <select aria-label="댓글 진영 필터" value={commentFilter} onChange={(e) => setCommentFilter(e.target.value as 'all' | 'A' | 'B')} className="bg-transparent border-none outline-none text-[#5f5e5e] cursor-pointer">
                      <option value="all">전체</option>
                      <option value="B">니 편</option>
                      <option value="A">내 편</option>
                    </select>
                    <select aria-label="댓글 정렬" value={commentSort} onChange={(e) => setCommentSort(e.target.value as 'latest' | 'likes')} className="bg-transparent border-none outline-none text-[#5f5e5e] cursor-pointer">
                      <option value="latest">최신순</option>
                      <option value="likes">좋아요 순</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredComments.map((c) => {
                    const displayVote = c.authorId === currentUser.id ? votedOption : c.authorVoted;
                    const thread = threads.find(group => group.id === c.id);
                    return (
                    <div key={c.id} id={`comment-${c.id}`} tabIndex={-1} className={`bg-white border border-[#E5E7EB] p-4 rounded-lg space-y-2 ${repliesEnabled && c.replyRootId ? 'ml-4 border-l-2 border-l-[var(--color-action-coral)]' : ''} ${focusCommentId === c.id ? 'ring-2 ring-[var(--color-action-coral)]' : ''}`}>
                      {c.deletedAt ? <p className="text-xs text-[var(--color-secondary-grey)]">삭제되었거나 볼 수 없는 댓글입니다.</p> : <>
                      {repliesEnabled && c.replyToId && <p className="text-xs text-[var(--color-secondary-grey)]">↳ {replyTargetLabel(c, comments)}님에게 답글</p>}
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
                          <button data-button-id="story-detail-modal-button-12"
                            onClick={() => onLikeComment(c.id)}
                            disabled={isPrivate || likePendingIds.includes(c.id)}
                            aria-pressed={Boolean(c.userLiked)}
                            aria-label={`댓글 공감 ${c.userLiked ? '취소' : '하기'} · ${c.likeCount}개`}
                            className="flex items-center gap-1 text-[#5f5e5e] hover:text-[#FF6B5A] disabled:opacity-50 disabled:cursor-wait"
                          >
                            <Heart className={`w-3.5 h-3.5 ${c.userLiked ? 'fill-[#FF6B5A] text-[#FF6B5A]' : ''}`} />
                            <span>{c.likeCount}</span>
                          </button>
                          {c.authorId === currentUser.id ? (
                            <div className="relative">
                              <button data-button-id="story-detail-modal-button-13" aria-label="댓글 메뉴 더보기" aria-expanded={commentMenuOpenId === c.id} onClick={() => setCommentMenuOpenId(commentMenuOpenId === c.id ? null : c.id)} className="text-[#5f5e5e] hover:text-[#1C1C1C] p-0.5 rounded cursor-pointer">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {commentMenuOpenId === c.id && (
                                <div className="absolute right-0 mt-1 w-20 bg-white border border-[#E5E7EB] rounded-lg shadow-lg py-1 z-10 text-xs overflow-hidden">
                                  {!isPrivate && <button data-button-id="story-detail-modal-button-14" onClick={() => { setEditingCommentId(c.id); setEditingCommentText(c.content); setCommentMenuOpenId(null); }} className="w-full text-left px-3 py-2 hover:bg-[#f9fafb] text-[#1C1C1C] cursor-pointer">수정</button>}
                                  <button data-analytics-exclude="true" data-button-id="story-detail-modal-button-15"
                                    disabled={commentMutationId === c.id}
                                    onClick={async () => {
                                      if (!onDeleteComment || commentMutationId) return;
                                      setCommentMutationId(c.id);
                                      let deleted = false;
                                      try { deleted = await onDeleteComment(story.id, c.id); } catch { deleted = false; }
                                      setCommentMutationId(null);
                                      if (deleted) setCommentMenuOpenId(null);
                                      else showToast('댓글을 삭제하지 못했습니다. 다시 시도해 주세요.');
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-[#f9fafb] text-red-500 cursor-pointer"
                                  >삭제</button>
                                </div>
                              )}
                            </div>
                          ) : !isPrivate ? (
                            <button data-analytics-exclude="true" data-button-id="story-detail-modal-button-16" onClick={() => onReportComment(c.id)} className="text-[#5f5e5e] hover:text-red-500 p-0.5 rounded cursor-pointer" title="신고">
                              <ShieldAlert className="w-4 h-4" />
                            </button>
                          ) : null}
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
                            <button data-button-id="story-detail-modal-button-17" disabled={commentMutationId === c.id} onClick={() => setEditingCommentId(null)} className="px-3 py-1.5 text-xs text-[#5f5e5e] hover:bg-[#f3f4f5] rounded-md cursor-pointer font-bold">취소</button>
                            <button data-button-id="story-detail-modal-button-18"
                              disabled={commentMutationId === c.id || !editingCommentText.trim()}
                              onClick={async () => {
                                if (!onEditComment || commentMutationId || !editingCommentText.trim()) return;
                                setCommentMutationId(c.id);
                                let saved = false;
                                try { saved = await onEditComment(story.id, c.id, editingCommentText.trim()); } catch { saved = false; }
                                setCommentMutationId(null);
                                if (saved) setEditingCommentId(null);
                                else showToast('댓글을 수정하지 못했습니다. 입력을 유지했으니 다시 시도해 주세요.');
                              }}
                              className="px-3 py-1.5 text-xs bg-[#1C1C1C] text-white rounded-md cursor-pointer font-bold"
                            >{commentMutationId === c.id ? '저장 중…' : '완료'}</button>
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
                      {repliesEnabled && !isPrivate && <button data-button-id="comment-reply-start" type="button" disabled={isCommentSubmitting} onClick={() => {
                        if (isGuest) { onRequireLogin?.('답글을 남기려면 로그인이 필요해요.'); return; }
                        setReplyTarget(c);
                        composerRef.current?.focus();
                        composerRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                      }} className="min-h-9 text-xs font-bold text-[var(--color-my-side-ink)] disabled:opacity-50">답글 달기</button>}
                      </>}
                      {repliesEnabled && !!thread?.replies.length && <button data-button-id="comment-replies-toggle" type="button" aria-expanded={expandedThreads.has(c.id)} onClick={() => setExpandedThreads(previous => { const next = new Set(previous); next.has(c.id) ? next.delete(c.id) : next.add(c.id); return next; })} className="block min-h-9 text-xs font-bold text-[var(--color-secondary-grey)]">답글 {thread.replies.length}개 {expandedThreads.has(c.id) ? '접기' : '보기'}</button>}
                    </div>
                  )})}
                </div>

                {/*
                  Add Comment Input

                  둘러보는 사람에게는 입력창을 아예 그리지 않는다. 열어두면
                  200자를 다 쓰고 '등록'을 눌러야 비로소 막히는데, 그때는 이미
                  쓴 글을 잃는다. 못 쓰는 건 처음부터 못 쓰게 보여야 한다.
                */}
                {isPrivate ? (
                  <p className="mt-4 rounded-lg border border-[#E5E7EB] bg-white p-4 text-xs text-[#5f5e5e]">비공개 상태에서는 작성자도 새 댓글을 달지 못합니다. 기존 댓글은 보관되며 다시 공개하면 보입니다.</p>
                ) : isGuest ? (
                  <div className="mt-4 bg-[#f9fafb] border border-[#E5E7EB] rounded-lg p-4 text-center">
                    <p className="text-xs text-[#5f5e5e] font-body-sm leading-relaxed">
                      댓글은 <span className="font-bold text-[#1C1C1C]">로그인한 뒤</span>에 남길 수 있어요.
                    </p>
                    <button data-button-id="story-detail-modal-button-19"
                      type="button"
                      onClick={() => onRequireLogin?.('댓글을 남기려면 로그인이 필요해요.')}
                      className="mt-3 px-4 py-2 bg-[#1C1C1C] text-white font-mono text-xs font-bold rounded hover:bg-black transition-colors cursor-pointer"
                    >
                      로그인하고 댓글 남기기
                    </button>
                  </div>
                ) : (
                <form onSubmit={handleCommentSubmit} className="relative mt-4 bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
                  {replyTarget && <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] px-3 py-2 text-xs" role="status"><span>{replyTargetUnavailable ? '답글을 달 대상이 삭제되었거나 가려졌어요.' : `${replyTarget.anonymousId}님에게 답글`}</span><button data-button-id="comment-reply-cancel" type="button" disabled={isCommentSubmitting} onClick={() => { setReplyTarget(null); composerRef.current?.focus(); }} className="shrink-0 p-2 underline">답글 취소</button></div>}
                  <textarea
                    ref={composerRef}
                    aria-label={replyTarget ? '답글 내용' : '댓글 내용'}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={isCommentSubmitting}
                    placeholder={replyTarget
                      ? "욕설이나 성적 수치심을 줄 수 있는 표현이 담긴 답글은 가려지거나 삭제될 수 있고, 반복되면 서비스 이용이 제한될 수 있어요."
                      : "욕설이나 성적 수치심을 줄 수 있는 표현이 담긴 댓글은 가려지거나 삭제될 수 있고, 반복되면 서비스 이용이 제한될 수 있어요."}
                    rows={3}
                    maxLength={200}
                    className="w-full p-3 font-body-sm text-xs focus:outline-none resize-none border-b border-[#E5E7EB]"
                  />
                  <div className="flex items-center justify-between p-2 px-3 bg-[#f9fafb]">
                    {/* 익명은 선택이 아니라 유일한 방식이다. 체크박스를 두면 실수로
                        닉네임이 노출되고, 사연에서 닉네임을 감춘 의미도 사라진다 */}
                    <span className="text-xs font-mono text-[#5f5e5e]">
                      {isMyStory ? '글쓴이로 표시됩니다.' : '익명으로 등록됩니다.'}
                    </span>
                    <div className="flex items-center gap-2.5">
                    {/* 최대 글자 수와 지금 글자 수. 다 차면 색으로 알린다 */}
                    <span aria-live="polite" className={`text-[11px] font-mono tabular-nums ${commentText.length >= 200 ? 'text-[#D6452F] font-bold' : 'text-[#5f5e5e]'}`}>
                      {commentText.length}/200
                    </span>
                    <button data-button-id="story-detail-modal-button-20"
                      type="submit"
                      disabled={isCommentSubmitting || !commentText.trim() || replyTargetUnavailable}
                      className="bg-[#1C1C1C] text-[#FF6B5A] px-3 py-1.5 font-mono text-xs font-bold rounded hover:bg-black transition-colors"
                    >
                      {isCommentSubmitting ? '확인 중…' : '등록'}
                    </button>
                    </div>
                  </div>
                </form>
                )}
              </div>
            </aside>
          </div>
        </div>

        {/* 결과를 본 사람에게만 공유를 연다. 투표 전에는 결과 자체가 가려져 있으므로
            공유 버튼이 먼저 나오면 그 가림이 무의미해진다 */}
        {!isPrivate && (!!votedOption || isMyStory) && (
          <ShareResultBar
            input={shareInput}
            url={shareUrl}
            onPreview={handlePreview}
          />
        )}

        {/* 공유 카드 미리보기. 사연 위에 덮어서 띄운다 —
            새 창을 띄우면 읽던 자리를 잃는다 */}
        {previewUrl && (
          <div data-analytics-screen="share_preview" data-analytics-layer="30" data-action-id="story-detail-modal-action-03"
            onClick={closePreview}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          >
            <div data-analytics-ignore="true"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white rounded-lg overflow-hidden border border-[#E5E7EB] shadow-2xl"
            >
              <img src={previewUrl} alt="공유 카드 미리보기" className="w-full block" />
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-[#f9fafb] border-t border-[#E5E7EB]">
                <span className="text-xs text-[#5f5e5e]">이 카드로 저장·공유돼요</span>
                <div className="flex items-center gap-2 shrink-0">
                  <button data-button-id="story-detail-modal-button-21"
                    type="button"
                    onClick={closePreview}
                    className="px-3 py-1.5 rounded border border-[#E5E7EB] bg-white text-[#1C1C1C] text-xs font-bold hover:bg-[#f3f4f5] transition-colors cursor-pointer"
                  >
                    닫기
                  </button>
                  <button data-button-id="story-detail-modal-preview-save"
                    type="button"
                    onClick={handleSavePreview}
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#1C1C1C] text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer"
                  >
                    <ImageDown className="w-3.5 h-3.5" aria-hidden="true" /> 이미지 저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
