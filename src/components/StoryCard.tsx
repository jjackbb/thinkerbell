import React, { useState } from 'react';
import { Story } from '../types';
import { ShieldAlert } from 'lucide-react';

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
    <div
      onClick={() => onSelect(story)}
      className="bg-white border-2 border-black p-4 sm:p-5 mb-4 group hover:border-[#e21500] transition-colors cursor-pointer elevated-tile"
    >
      {/* Top Meta info */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="bg-[#cdbbff] px-2.5 py-0.5 font-mono text-[11px] text-black font-extrabold border border-black uppercase tracking-tight">
            {story.category}
          </span>
          <span className="font-mono text-xs text-[#5e5e5e] font-bold truncate max-w-[140px]">
            {story.authorNickname}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {story.isHot && (
            <span className="font-mono text-[10px] font-black px-2 py-0.5 bg-[#e21500] text-white border border-black flex items-center gap-0.5 uppercase tracking-wider">
              🔥 HOT
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReport(story.id);
            }}
            className="text-black hover:text-[#e21500] p-1 transition-colors cursor-pointer"
            title="사연 신고"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base sm:text-lg font-black text-black leading-snug mb-2 tracking-tight group-hover:text-[#e21500] transition-colors">
        {story.title}
      </h3>

      {/* Excerpt Body */}
      <p className="text-xs sm:text-sm text-black opacity-90 line-clamp-3 mb-4 leading-relaxed font-bold">
        {story.body}
      </p>

      {/* 1-Sec Voting Bar */}
      <div className="bg-[#f0f0f0] p-3 mb-3 border-2 border-black" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between font-mono text-xs font-black mb-2">
          <span className="flex items-center gap-1 text-[#e21500] uppercase">
            <span className="material-symbols-outlined text-[16px]">how_to_vote</span> 1초 투표판
          </span>
          <span className="text-[11px] text-[#5e5e5e] font-bold">{totalVotes}명 참여</span>
        </div>

        {/* Gauge Bar */}
        <div className="w-full bg-white h-4 border-2 border-black flex overflow-hidden mb-2.5">
          <div
            className="bg-[#e21500] h-full transition-all duration-500 flex items-center px-1"
            style={{ width: `${percentA}%` }}
          >
            {percentA > 15 && <span className="font-mono text-[9px] text-white font-black">{percentA}%</span>}
          </div>
          <div
            className="bg-white h-full transition-all duration-500 flex items-center justify-end px-1"
            style={{ width: `${percentB}%` }}
          >
            {percentB > 15 && <span className="font-mono text-[9px] text-black font-black">{percentB}%</span>}
          </div>
        </div>

        {/* Vote Option Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={(e) => handleVoteClick(e, 'A')}
            className={`py-2 px-3 border-2 border-black font-black text-xs transition-all flex items-center justify-between cursor-pointer ${
              votedOption === 'A'
                ? 'bg-[#e21500] text-white shadow-[2px_2px_0px_#000]'
                : 'bg-white text-black hover:bg-[#e21500] hover:text-white'
            }`}
          >
            <span>A. 내편 ({story.votesA})</span>
            <span className="font-mono">{percentA}%</span>
          </button>

          <button
            onClick={(e) => handleVoteClick(e, 'B')}
            className={`py-2 px-3 border-2 border-black font-black text-xs transition-all flex items-center justify-between cursor-pointer ${
              votedOption === 'B'
                ? 'bg-black text-white shadow-[2px_2px_0px_#e21500]'
                : 'bg-white text-black hover:bg-black hover:text-white'
            }`}
          >
            <span>B. 상대편 ({story.votesB})</span>
            <span className="font-mono">{percentB}%</span>
          </button>
        </div>
      </div>

      {/* Footer Info & AI Simulation Action */}
      <div className="flex items-center justify-between pt-1 font-mono text-xs">
        <div className="flex items-center gap-3 text-black font-bold">
          <span className="flex items-center gap-1 text-[#e21500]">
            <span className="material-symbols-outlined text-[16px]">chat_bubble</span> {story.commentCount}
          </span>
          <span className="flex items-center gap-1 text-[#5e5e5e]">
            <span className="material-symbols-outlined text-[16px]">visibility</span> {story.viewCount}
          </span>
        </div>

        {/* AI Chat Link */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartAIChatWithStory(story);
          }}
          className="flex items-center gap-1 px-3 py-1.5 bg-black text-white border-2 border-black hover:bg-[#e21500] font-mono font-black text-xs transition-all active:scale-95 cursor-pointer uppercase"
        >
          <span className="material-symbols-outlined text-[16px] text-[#fffa82]">smart_toy</span>
          <span>AI SIM CHAT</span>
        </button>
      </div>
    </div>
  );
};

