import React, { useState } from 'react';
import { Story, Comment, UserProfile } from '../types';
import { X, ThumbsUp, MessageSquare, Bot, Heart, ShieldAlert, Send, Sparkles, Share2 } from 'lucide-react';

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

  const handleVote = (option: 'A' | 'B') => {
    if (votedOption) {
      showToast('이미 투표에 참여하셨습니다.');
      return;
    }
    setVotedOption(option);
    onVote(story.id, option);
    showToast(option === 'A' ? '내편에 투표하셨습니다! 👍' : '상대편에 투표하셨습니다.');
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (commentText.length > 200) {
      showToast('댓글은 최대 200자까지 작성할 수 있습니다.');
      return;
    }
    onAddComment(story.id, commentText.trim());
    setCommentText('');
    showToast('익명 공감 댓글이 등록되었습니다! 💬');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: story.title,
        text: story.body.slice(0, 50) + '...',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('사연 링크가 복사되었습니다!');
    }
  };

  const totalVotes = story.votesA + story.votesB;
  const percentA = totalVotes > 0 ? Math.round((story.votesA / totalVotes) * 100) : 50;
  const percentB = 100 - percentA;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#fffaf0] border border-[#e8e2d0] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-[#0a0a0a] text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-bounce flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#ff4d8b]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#ebe6d6] flex items-center justify-between bg-[#faf5e8]">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#f5f0e0] text-[#0a0a0a] text-xs font-bold border border-[#e8e2d0]">
              {story.category}
            </span>
            <span className="text-xs text-[#6a6a6a] font-medium">
              작성자: <span className="font-bold text-[#0a0a0a]">{story.authorNickname}</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleShare}
              className="p-1.5 rounded-xl hover:bg-[#e8e2d0] text-[#0a0a0a] transition-colors cursor-pointer"
              title="공유하기"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onReportStory(story.id)}
              className="p-1.5 rounded-xl hover:bg-[#e8e2d0] text-[#0a0a0a] transition-colors cursor-pointer"
              title="사연 신고"
            >
              <ShieldAlert className="w-4 h-4 text-red-500" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-[#e8e2d0] text-[#0a0a0a] transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Title & Body */}
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#0a0a0a] mb-3 leading-snug font-display">
              {story.title}
            </h2>
            <div className="text-xs text-[#6a6a6a] mb-4 flex items-center gap-3">
              <span>{new Date(story.createdAt).toLocaleDateString()}</span>
              <span>조회수 {story.viewCount}</span>
            </div>
            <div className="text-sm sm:text-base text-[#3a3a3a] whitespace-pre-line leading-relaxed bg-[#f5f0e0] p-4 rounded-2xl border border-[#e8e2d0]">
              {story.body}
            </div>
          </div>

          {/* 1-Sec Voting Section */}
          <div className="bg-[#1a3a3a] text-white p-5 rounded-2xl shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#ff4d8b] bg-white/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                <ThumbsUp className="w-3.5 h-3.5" /> 1초 투표 ('니편 vs 내편')
              </span>
              <span className="text-xs text-gray-300 font-mono">{totalVotes}명 참여</span>
            </div>

            {/* Live Percentage Bar */}
            <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden flex mb-3">
              <div
                className="bg-[#ff4d8b] h-full transition-all duration-500"
                style={{ width: `${percentA}%` }}
              />
              <div
                className="bg-[#b8a4ed] h-full transition-all duration-500"
                style={{ width: `${percentB}%` }}
              />
            </div>

            {/* Voting Options */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleVote('A')}
                className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex flex-col gap-1 cursor-pointer ${
                  votedOption === 'A'
                    ? 'bg-[#ff4d8b] text-white ring-2 ring-white shadow-lg'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span>A. 내편</span>
                  <span className="text-sm font-black">{percentA}%</span>
                </div>
                <span className="text-[11px] font-normal opacity-80">사연자 지지 & 공감</span>
              </button>

              <button
                onClick={() => handleVote('B')}
                className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex flex-col gap-1 cursor-pointer ${
                  votedOption === 'B'
                    ? 'bg-[#b8a4ed] text-[#0a0a0a] ring-2 ring-white shadow-lg'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span>B. 상대편</span>
                  <span className="text-sm font-black">{percentB}%</span>
                </div>
                <span className="text-[11px] font-normal opacity-80">상대방 입장 이해</span>
              </button>
            </div>
          </div>

          {/* AI Persona Chat Action Card */}
          <div className="bg-[#ff4d8b] text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div>
              <h4 className="text-sm font-bold flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-white" /> 이 사연의 상대방과 직접 대화해보세요!
              </h4>
              <p className="text-xs text-white/90 mt-0.5">
                AI 시뮬레이션으로 마음속 앙금을 1:1로 직접 털어놓고 해소하세요.
              </p>
            </div>
            <button
              onClick={() => onStartAIChat(story)}
              className="w-full sm:w-auto px-4 py-2.5 bg-[#0a0a0a] hover:bg-[#1f1f1f] text-white font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
            >
              지금 AI와 대화하기
            </button>
          </div>

          {/* Comments Section */}
          <div>
            <h3 className="text-sm font-bold text-[#0a0a0a] mb-3 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-[#ff4d8b]" /> 익명 공감 댓글 ({comments.length})
            </h3>

            {/* Comment Input */}
            <form onSubmit={handleCommentSubmit} className="mb-4">
              <div className="relative">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="사연자에게 전할 솔직한 공감이나 따뜻한 위로의 글을 적어주세요 (최대 200자)"
                  maxLength={200}
                  rows={2}
                  className="w-full p-3 pr-12 text-xs sm:text-sm bg-[#faf5e8] border border-[#e8e2d0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#ff4d8b] resize-none"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="absolute right-2.5 bottom-3.5 p-2 bg-[#0a0a0a] disabled:bg-gray-300 text-white rounded-xl transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="text-[11px] text-[#6a6a6a] text-right mt-1">
                {commentText.length}/200자
              </div>
            </form>

            {/* Comment List */}
            <div className="space-y-2.5">
              {comments.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#6a6a6a] bg-[#faf5e8] rounded-2xl border border-dashed border-[#e8e2d0]">
                  아직 댓글이 없습니다. 첫 번째로 공감 댓글을 남겨보세요!
                </div>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3.5 bg-[#f5f0e0] border border-[#e8e2d0] rounded-2xl text-xs sm:text-sm space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-[#6a6a6a]">
                      <span className="text-[#0a0a0a] font-bold">{comment.anonymousId}</span>
                      <div className="flex items-center gap-2">
                        <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <button
                          onClick={() => onReportComment(comment.id)}
                          className="text-gray-400 hover:text-red-500 cursor-pointer"
                          title="댓글 신고"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[#3a3a3a] leading-relaxed whitespace-pre-line">
                      {comment.content}
                    </p>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => onLikeComment(comment.id)}
                        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                          comment.userLiked
                            ? 'bg-[#ff4d8b] text-white border-[#ff4d8b]'
                            : 'bg-white text-[#6a6a6a] border-[#e8e2d0] hover:bg-[#faf5e8]'
                        }`}
                      >
                        <Heart className={`w-3 h-3 ${comment.userLiked ? 'fill-current' : ''}`} />
                        <span>공감 {comment.likeCount}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
