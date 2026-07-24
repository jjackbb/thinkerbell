import React, { useState } from 'react';
import { Story } from '../types';
import { ThumbsUp, MessageSquare, Bot, Eye, ShieldAlert, Sparkles, Share2 } from 'lucide-react';

interface StoryCardProps {
  story: Story;
  onSelect: (story: Story) => void;
  onVote: (storyId: string, option: 'A' | 'B') => void;
  onStartAIChatWithStory: (story: Story) => void;
  onReport: (storyId: string) => void;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  onSelect,
  onVote,
  onStartAIChatWithStory,
  onReport,
}) => {
  const [votedOption, setVotedOption] = useState<'A' | 'B' | null>(story.userVoted || null);

  const handleVoteClick = (e: React.MouseEvent, option: 'A' | 'B') => {
    e.stopPropagation();
    if (votedOption) return;
    setVotedOption(option);
    onVote(story.id, option);
  };

  const totalVotes = story.votesA + story.votesB;
  const percentA = totalVotes > 0 ? Math.round((story.votesA / totalVotes) * 100) : 50;
  const percentB = 100 - percentA;

  // Clay styling mapping
  const cardBgClasses: Record<string, string> = {
    pink: 'bg-[#ff4d8b] text-white border-[#ff4d8b]',
    teal: 'bg-[#1a3a3a] text-white border-[#1a3a3a]',
    lavender: 'bg-[#b8a4ed] text-[#0a0a0a] border-[#a591e0]',
    peach: 'bg-[#ffb084] text-[#0a0a0a] border-[#f09f72]',
    ochre: 'bg-[#e8b94a] text-[#0a0a0a] border-[#d8a83a]',
    cream: 'bg-[#f5f0e0] text-[#0a0a0a] border-[#e8e2d0]',
  };

  const isDarkCard = story.cardColor === 'pink' || story.cardColor === 'teal';

  return (
    <div
      onClick={() => onSelect(story)}
      className={`rounded-2xl p-5 mb-4 border transition-all cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
        cardBgClasses[story.cardColor] || cardBgClasses.cream
      }`}
    >
      {/* Top Meta info */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
            isDarkCard ? 'bg-white/20 text-white' : 'bg-black/10 text-[#0a0a0a]'
          }`}>
            {story.category}
          </span>
          <span className="text-xs font-semibold opacity-80 truncate max-w-[120px]">
            {story.authorNickname}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {story.isHot && (
            <span className="text-[11px] font-black px-2 py-0.5 bg-red-500 text-white rounded-md flex items-center gap-0.5">
              🔥 HOT
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReport(story.id);
            }}
            className="opacity-60 hover:opacity-100 p-1 rounded-md transition-opacity cursor-pointer"
            title="사연 신고"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base sm:text-lg font-bold leading-snug mb-2 font-display">
        {story.title}
      </h3>

      {/* Excerpt Body */}
      <p className="text-xs sm:text-sm opacity-90 line-clamp-3 mb-4 leading-relaxed font-normal">
        {story.body}
      </p>

      {/* 1-Sec Voting Bar */}
      <div className="bg-black/10 backdrop-blur-xs rounded-xl p-3 mb-3 border border-black/5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between text-xs font-extrabold mb-2">
          <span className="flex items-center gap-1">
            <ThumbsUp className="w-3.5 h-3.5" /> 1초 투표 ('니편 vs 내편')
          </span>
          <span className="text-[11px] opacity-80">{totalVotes}명 참여</span>
        </div>

        {/* Gauge Bar */}
        <div className="w-full bg-black/20 h-2.5 rounded-full overflow-hidden flex mb-2.5">
          <div
            className="bg-[#ff4d8b] h-full transition-all duration-500"
            style={{ width: `${percentA}%` }}
          />
          <div
            className="bg-[#1a3a3a] h-full transition-all duration-500"
            style={{ width: `${percentB}%` }}
          />
        </div>

        {/* Vote Option Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={(e) => handleVoteClick(e, 'A')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
              votedOption === 'A'
                ? 'bg-[#ff4d8b] text-white ring-2 ring-white shadow-md'
                : 'bg-white/80 hover:bg-white text-[#0a0a0a]'
            }`}
          >
            <span>A. 내편 ({story.votesA})</span>
            <span className="font-extrabold">{percentA}%</span>
          </button>

          <button
            onClick={(e) => handleVoteClick(e, 'B')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
              votedOption === 'B'
                ? 'bg-[#1a3a3a] text-white ring-2 ring-white shadow-md'
                : 'bg-white/80 hover:bg-white text-[#0a0a0a]'
            }`}
          >
            <span>B. 상대편 ({story.votesB})</span>
            <span className="font-extrabold">{percentB}%</span>
          </button>
        </div>
      </div>

      {/* Footer Info & AI Simulation Action */}
      <div className="flex items-center justify-between pt-1 text-xs">
        <div className="flex items-center gap-3 opacity-80">
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" /> {story.commentCount}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> {story.viewCount}
          </span>
        </div>

        {/* AI Chat Link */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartAIChatWithStory(story);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer ${
            isDarkCard
              ? 'bg-white text-[#0a0a0a] hover:bg-[#faf5e8]'
              : 'bg-[#0a0a0a] text-white hover:bg-[#1f1f1f]'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-[#ff4d8b]" />
          <span>AI 상대와 1:1 대화하기</span>
        </button>
      </div>
    </div>
  );
};
