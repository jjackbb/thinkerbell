import React, { useState } from 'react';
import { Story } from '../types';
import { ShieldAlert, Share2 } from 'lucide-react';

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

  return (
    <article
      onClick={() => onSelect(story)}
      className="bg-white border border-[#E5E7EB] group hover:border-[#3ECF8E] transition-all duration-300 flex flex-col cursor-pointer rounded-lg overflow-hidden shadow-xs hover:-translate-y-1"
    >
      {/* Top Meta Header */}
      <div className="p-6 pb-0 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-xs px-2.5 py-0.5 bg-[#f3f4f5] border border-[#E5E7EB] text-[#1C1C1C] font-semibold rounded">
              {story.category}
            </span>
            <span className="font-label-md text-xs text-[#5f5e5e]">{story.authorNickname}</span>
            <span className="text-[#5f5e5e]/40">•</span>
            <span className="font-label-sm text-[11px] text-[#5f5e5e]/60">
              {new Date(story.createdAt).toLocaleDateString()}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onReport(story.id);
            }}
            className="text-[#5f5e5e] hover:text-[#ba1a1a] p-1 transition-colors"
            title="사연 신고"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        <h4 className="font-headline-md text-base sm:text-lg font-bold text-[#1C1C1C] mb-3 group-hover:text-[#3ECF8E] transition-colors leading-snug">
          {story.title}
        </h4>

        {/* Excerpt Body */}
        <p className="text-[#5f5e5e] font-body-sm text-xs sm:text-sm mb-6 line-clamp-3 leading-relaxed">
          {story.body}
        </p>

        {/* Live Vote Gauge */}
        <div className="mt-auto pt-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between font-label-sm text-xs mb-2">
            <span className="text-[#3ECF8E] font-bold">A. 내편 ({percentA}%)</span>
            <span className="text-[#5f5e5e]">B. 상대편 ({percentB}%)</span>
          </div>

          <div className="flex w-full h-2 rounded-full overflow-hidden bg-[#f3f4f5] mb-3">
            <div className="bg-[#3ECF8E] h-full vote-bar-progress" style={{ width: `${percentA}%` }}></div>
            <div className="bg-[#5f5e5e]/20 h-full vote-bar-progress" style={{ width: `${percentB}%` }}></div>
          </div>

          {/* Quick Vote Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={(e) => handleVoteClick(e, 'A')}
              className={`py-2 px-3 rounded-lg font-label-sm text-xs font-bold transition-all cursor-pointer ${
                votedOption === 'A'
                  ? 'bg-[#3ECF8E] text-[#1C1C1C]'
                  : 'bg-[#f3f4f5] text-[#1C1C1C] hover:bg-[#3ECF8E]/20'
              }`}
            >
              내편 투표
            </button>
            <button
              onClick={(e) => handleVoteClick(e, 'B')}
              className={`py-2 px-3 rounded-lg font-label-sm text-xs font-bold transition-all cursor-pointer ${
                votedOption === 'B'
                  ? 'bg-[#1C1C1C] text-white'
                  : 'bg-[#f3f4f5] text-[#1C1C1C] hover:bg-[#1C1C1C]/10'
              }`}
            >
              상대편 투표
            </button>
          </div>
        </div>
      </div>

      {/* Card Footer Info */}
      <div className="p-4 px-6 bg-white border-t border-[#E5E7EB] flex items-center justify-between">
        <div className="flex gap-4">
          <span className="flex items-center gap-1 text-[#5f5e5e] font-label-sm text-xs">
            <span className="material-symbols-outlined text-[18px]">forum</span> {story.commentCount}
          </span>
          <span className="flex items-center gap-1 text-[#5f5e5e] font-label-sm text-xs">
            <span className="material-symbols-outlined text-[18px]">how_to_vote</span> {totalVotes}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartAIChatWithStory(story);
          }}
          className="flex items-center gap-1 text-xs font-mono font-bold text-[#1C1C1C] hover:text-[#3ECF8E] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">memory</span>
          <span>AI 대화</span>
        </button>
      </div>
    </article>
  );
};


