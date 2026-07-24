import React, { useState } from 'react';
import { Story, Comment, UserProfile } from '../types';
import { X, ShieldAlert, Share2, Send, Heart } from 'lucide-react';

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
      showToast('이미 투표하셨습니다.');
      return;
    }
    setVotedOption(option);
    onVote(story.id, option);
    showToast(option === 'A' ? '내편 투표완료!' : '니편 투표완료!');
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(story.id, commentText.trim());
    setCommentText('');
    showToast('분석 데이터(댓글)가 추가되었습니다!');
  };

  const totalVotes = story.votesA + story.votesB;
  const percentA = totalVotes > 0 ? Math.round((story.votesA / totalVotes) * 100) : 50;
  const percentB = 100 - percentA;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white border-4 border-black w-full max-w-xl max-h-[92vh] flex flex-col elevated-tile overflow-hidden relative">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#e21500] text-white px-4 py-2 border-2 border-black font-mono text-xs font-black shadow-[4px_4px_0px_#000] uppercase">
            {toastMessage}
          </div>
        )}

        {/* Navigation Bar */}
        <nav className="sticky top-0 z-40 bg-white flex justify-between items-center px-4 py-3 border-b-2 border-black">
          <div className="flex items-center gap-3">
            <span onClick={onClose} className="material-symbols-outlined text-[#e21500] font-black cursor-pointer active:scale-95">
              arrow_back
            </span>
            <span className="font-headline-md-mobile text-lg font-black tracking-tighter text-black">니편내편</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onReportStory(story.id)} className="text-black hover:text-[#e21500]">
              <ShieldAlert className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="text-black font-black">
              <X className="w-6 h-6" />
            </button>
          </div>
        </nav>

        {/* Modal Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          {/* Hero Section */}
          <header className="bg-black p-5 sm:p-6 text-white border-b-2 border-black">
            <div className="flex items-center gap-2 mb-3 font-mono">
              <span className="bg-[#e21500] text-white text-[10px] px-2 py-0.5 uppercase font-black border border-white">
                {story.category}
              </span>
              <span className="text-[#e0e0e0] text-[10px] uppercase font-bold">ENTRY #{story.id.slice(-4)}</span>
            </div>
            <h1 className="font-headline-md text-xl sm:text-2xl font-black leading-tight tracking-tight">
              {story.title}
            </h1>
          </header>

          {/* Body Content */}
          <article className="p-5 sm:p-6 space-y-4 border-b-2 border-black">
            <p className="font-body-base text-sm sm:text-base text-black leading-relaxed font-bold whitespace-pre-line">
              {story.body}
            </p>
            <div className="flex items-center gap-4 pt-3 text-[#5e5e5e] font-mono text-[11px] border-t border-[#e0e0e0] font-bold">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">schedule</span>
                <span>{new Date(story.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                <span>{story.viewCount} VIEWS</span>
              </div>
            </div>
          </article>

          {/* Voting Section */}
          <section className="p-5 sm:p-6 bg-white border-b-2 border-black">
            <h3 className="font-mono text-xs text-[#e21500] mb-4 uppercase tracking-[0.2em] font-black text-center">
              Execute Final Decision
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Naepyeon */}
              <button
                onClick={() => handleVote('A')}
                className={`group relative flex flex-col items-center justify-center p-6 bg-[#e21500] border-2 border-black vote-btn-shadow transition-all ${
                  votedOption === 'A' ? 'ring-4 ring-black' : ''
                }`}
              >
                <span className="text-white text-2xl font-black z-10">내편</span>
                <span className="text-white/80 font-mono text-[10px] uppercase font-black mt-1 z-10 tracking-widest">
                  Authorize ({percentA}%)
                </span>
              </button>

              {/* Nipyeon */}
              <button
                onClick={() => handleVote('B')}
                className={`group relative flex flex-col items-center justify-center p-6 bg-white border-2 border-black vote-btn-shadow transition-all ${
                  votedOption === 'B' ? 'ring-4 ring-black' : ''
                }`}
              >
                <span className="text-black text-2xl font-black z-10">니편</span>
                <span className="text-black/60 font-mono text-[10px] uppercase font-black mt-1 z-10 tracking-widest">
                  Reject ({percentB}%)
                </span>
              </button>
            </div>

            {/* Voting Bar */}
            <div className="mt-4 h-8 w-full flex border-2 border-black overflow-hidden font-mono font-black text-xs">
              <div className="bg-[#e21500] text-white flex items-center px-2 transition-all duration-500" style={{ width: `${percentA}%` }}>
                {percentA}%
              </div>
              <div className="bg-white text-black flex items-center justify-end px-2 transition-all duration-500" style={{ width: `${percentB}%` }}>
                {percentB}%
              </div>
            </div>
          </section>

          {/* AI Simulation CTA */}
          <div className="p-4 bg-[#fffa82] border-b-2 border-black flex items-center justify-between">
            <div className="font-mono text-xs font-black text-black">
              <span>상대방과 1:1 시뮬레이션 대화하기</span>
            </div>
            <button
              onClick={() => onStartAIChat(story)}
              className="px-4 py-2 bg-[#e21500] text-white font-mono font-black text-xs border-2 border-black uppercase active:translate-y-0.5 shadow-[2px_2px_0px_#000]"
            >
              AI SIM CHAT
            </button>
          </div>

          {/* Comments Section */}
          <section className="p-5 sm:p-6 bg-white">
            <div className="flex items-center justify-between mb-4 border-b-4 border-black pb-1">
              <h4 className="font-headline-sm text-base font-black uppercase">분석 데이터 ({comments.length})</h4>
            </div>

            <div className="space-y-3 mb-6">
              {comments.map((c) => (
                <div key={c.id} className="border-l-4 border-[#e21500] pl-3 py-2 bg-[#f5f5f5] border-y border-r border-black">
                  <div className="flex items-center justify-between mb-1 font-mono text-xs">
                    <span className="font-black text-[#e21500]">{c.anonymousId}</span>
                    <button onClick={() => onLikeComment(c.id)} className="flex items-center gap-1 text-black font-bold">
                      <Heart className={`w-3.5 h-3.5 ${c.userLiked ? 'fill-[#e21500] text-[#e21500]' : ''}`} />
                      <span>{c.likeCount}</span>
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-black leading-snug">{c.content}</p>
                </div>
              ))}
            </div>

            {/* Comment Input */}
            <form onSubmit={handleCommentSubmit} className="relative border-2 border-black">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="INPUT NEW PERSPECTIVE..."
                rows={3}
                maxLength={200}
                className="w-full bg-white p-3 font-mono text-xs font-bold outline-none resize-none"
              />
              <button
                type="submit"
                className="absolute bottom-3 right-3 bg-[#e21500] text-white px-4 py-1.5 border-2 border-black font-black font-mono text-xs uppercase active:translate-x-0.5 active:translate-y-0.5"
              >
                Transmit
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

