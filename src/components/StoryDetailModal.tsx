import React, { useState } from 'react';
import { Story, Comment, UserProfile } from '../types';
import { X, ShieldAlert, Share2, Heart, ThumbsUp, ThumbsDown } from 'lucide-react';

interface StoryDetailModalProps {
  story: Story | null;
  comments: Comment[];
  currentUser: UserProfile;
  onClose: () => void;
  onVote: (storyId: string, option: 'A' | 'B') => void;
  onAddComment: (storyId: string, content: string) => void;
  onLikeComment: (commentId: string) => void;
  onStartAIChat: (story: Story) => void;
  onReportStory: (storyId: string) => void;
  onReportComment: (commentId: string) => void;
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
  onReportStory,
  onReportComment,
}) => {
  if (!story) return null;

  const [commentText, setCommentText] = useState('');
  const [votedOption, setVotedOption] = useState<'A' | 'B' | null>(story.userVoted || null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const isMyStory = currentUser.id === story.authorId;

  const handleVote = (option: 'A' | 'B') => {
    if (votedOption && story.voteChanged) {
      showToast('투표는 최대 1번만 변경할 수 있습니다.');
      return;
    }
    setVotedOption(option);
    onVote(story.id, option);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(story.id, commentText.trim());
    setCommentText('');
    showToast('논리 분석 댓글이 등록되었습니다.');
  };

  const totalVotes = story.votesA + story.votesB;
  const percentA = totalVotes > 0 ? Math.round((story.votesA / totalVotes) * 100) : 0;
  const percentB = totalVotes > 0 ? 100 - percentA : 0;
  const isZeroVotes = totalVotes === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#f8f9fa] text-[#191c1d] rounded-lg w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden relative shadow-2xl border border-[#E5E7EB]">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1C1C1C] text-[#3ECF8E] px-4 py-2 rounded border border-[#3ECF8E]/40 font-mono text-xs font-bold shadow-md">
            {toastMessage}
          </div>
        )}

        {/* Modal Top Bar */}
        <header className="sticky top-0 z-40 bg-[#1C1C1C] text-white flex justify-between items-center px-6 py-4 border-b border-[#1C1C1C]">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#3ECF8E]">terminal</span>
            <h1 className="font-headline-md text-base font-bold text-[#3ECF8E]">니편내편</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => onReportStory(story.id)} className="text-[#5f5e5e] hover:text-[#ba1a1a]">
              <ShieldAlert className="w-5 h-5" />
            </button>
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
              <span className="inline-flex items-center gap-1 bg-[#3ECF8E]/10 border border-[#3ECF8E] text-[#3ECF8E] px-2 py-0.5 rounded text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-[#3ECF8E] animate-pulse"></span>
                {story.category}
              </span>
              <span className="font-mono text-xs text-[#5f5e5e]">POST ID: #{story.id.slice(-6)}</span>
            </div>
            <h2 className="font-display-lg text-xl sm:text-2xl font-bold mb-4 leading-tight">
              {story.title}
            </h2>
            <div className="flex flex-wrap items-center gap-6 text-[#5f5e5e] font-mono text-xs">
              <span>{new Date(story.createdAt).toLocaleDateString()}</span>
              <span>{story.viewCount} Views</span>
              <span>{comments.length} Comments</span>
            </div>
          </section>

          {/* Main Layout Grid */}
          <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8">
            {/* Left Story Body & Vote */}
            <div className="flex-1 space-y-8">
              <article className="prose max-w-none">
                <p className="font-body-lg text-sm sm:text-base text-[#191c1d] leading-relaxed whitespace-pre-line">
                  {story.body}
                </p>
              </article>

              {/* Voting Section */}
              <div className="space-y-4 pt-4 border-t border-[#E5E7EB]">
                <div className="flex items-end justify-between">
                  <h3 className="font-headline-md text-base font-bold">당신의 선택은?</h3>
                  <p className="font-mono text-xs text-[#5f5e5e]">Current Votes: {totalVotes}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* My Side (내편) */}
                  <button
                    onClick={() => handleVote('A')}
                    disabled={!!votedOption && !!story.voteChanged}
                    className={`group relative overflow-hidden flex flex-col items-center justify-center p-6 bg-[#3ECF8E] text-[#1C1C1C] rounded-lg transition-all active:scale-[0.98] border-2 border-[#3ECF8E] cursor-pointer ${
                      votedOption === 'A' ? 'ring-4 ring-[#3ECF8E]/30' : ''
                    }`}
                  >
                    <ThumbsUp className={`w-8 h-8 mb-2 group-hover:scale-110 transition-transform`} />
                    <span className="font-headline-lg text-lg font-black mb-1">내편</span>
                    <span className="font-mono text-[10px] uppercase font-bold opacity-80">Team Author</span>
                    <span className="absolute top-3 right-3 font-mono text-xs font-bold">{percentA}%</span>
                  </button>

                  {/* Opposite Side (니편) */}
                  <button
                    onClick={() => handleVote('B')}
                    disabled={!!votedOption && !!story.voteChanged}
                    className={`group relative overflow-hidden flex flex-col items-center justify-center p-6 bg-[#f3f4f5] text-[#1C1C1C] rounded-lg transition-all active:scale-[0.98] border-2 border-[#E5E7EB] cursor-pointer ${
                      votedOption === 'B' ? 'ring-4 ring-[#1C1C1C]/20' : ''
                    }`}
                  >
                    <ThumbsDown className={`w-8 h-8 mb-2 text-[#5f5e5e] group-hover:scale-110 transition-transform`} />
                    <span className="font-headline-lg text-lg font-black mb-1">니편</span>
                    <span className="font-mono text-[10px] text-[#5f5e5e] uppercase font-bold">Team Opponent</span>
                    <span className="absolute top-3 right-3 font-mono text-xs font-bold text-[#5f5e5e]">{percentB}%</span>
                  </button>
                </div>
              </div>

              {/* AI Chat CTA */}
              <div className="p-4 bg-[#1C1C1C] text-white rounded-lg flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-[#3ECF8E]">Ai 시뮬레이션</h4>
                  <p className="text-[11px] text-[#5f5e5e] font-mono mt-0.5">AI 시뮬레이션으로 입장 차이를 확인하세요.</p>
                </div>
                <button
                  onClick={() => onStartAIChat(story)}
                  className="px-4 py-2 bg-[#3ECF8E] text-[#1C1C1C] font-mono font-bold text-xs rounded hover:bg-[#3ECF8E]/90 cursor-pointer"
                >
                  START AI SIM
                </button>
              </div>
            </div>

            {/* Right Analysis Data & Comments */}
            <aside className="w-full lg:w-80 space-y-6">
              {/* Analysis Data Card */}
              <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between">
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#3ECF8E]"></span> Analysis Data
                  </h4>
                </div>
                <div className="p-5 space-y-3 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#5f5e5e]">Sentiment Logic</span>
                    <span className="text-[#3ECF8E] font-bold">Stable</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                    {!isZeroVotes && (
                      <div className="h-full bg-[#3ECF8E]" style={{ width: `${percentA}%` }}></div>
                    )}
                  </div>
                </div>
              </div>

              {/* Comments Feed */}
              <div className="space-y-3">
                <h4 className="font-headline-md text-sm font-bold">Feed Analysis ({comments.length})</h4>

                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="bg-white border border-[#E5E7EB] p-4 rounded-lg space-y-2">
                      <div className="flex items-center justify-between font-mono text-xs">
                        <span className="font-bold text-[#1C1C1C]">{c.anonymousId}</span>
                        <button onClick={() => onLikeComment(c.id)} className="flex items-center gap-1 text-[#5f5e5e] hover:text-[#3ECF8E]">
                          <Heart className={`w-3.5 h-3.5 ${c.userLiked ? 'fill-[#3ECF8E] text-[#3ECF8E]' : ''}`} />
                          <span>{c.likeCount}</span>
                        </button>
                      </div>
                      <p className="text-xs text-[#1C1C1C] font-body-sm leading-relaxed">{c.content}</p>
                    </div>
                  ))}
                </div>

                {/* Add Comment Input */}
                <form onSubmit={handleCommentSubmit} className="relative mt-4">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Share your logic..."
                    rows={3}
                    maxLength={200}
                    className="w-full bg-white border border-[#E5E7EB] p-3 font-body-sm text-xs rounded-lg focus:outline-none focus:border-[#3ECF8E] resize-none"
                  />
                  <button
                    type="submit"
                    className="absolute bottom-3 right-3 bg-[#1C1C1C] text-[#3ECF8E] px-3 py-1.5 font-mono text-xs font-bold rounded hover:bg-black"
                  >
                    EXECUTE
                  </button>
                </form>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};


