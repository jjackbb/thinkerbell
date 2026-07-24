import React, { useState } from 'react';
import { Story, UserProfile } from '../types';
import { ShieldAlert, Share2 } from 'lucide-react';

interface StoryCardProps {
  story: Story;
  currentUser?: UserProfile;
  onSelect: (story: Story) => void;
  onVote: (storyId: string, option: 'A' | 'B') => void;
  onReport: (storyId: string) => void;
  isUserAdultVerified?: boolean;
  onRequireAdultVerification?: () => void;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  currentUser,
  onSelect,
  onVote,
  onReport,
  isUserAdultVerified,
  onRequireAdultVerification,
}) => {
  const [votedOption, setVotedOption] = useState<'A' | 'B' | null>(story.userVoted || null);
  const isBlurRequired = story.isAdult && !isUserAdultVerified;
  const isMyStory = currentUser?.id === story.authorId;

  const handleVoteClick = (e: React.MouseEvent, option: 'A' | 'B') => {
    e.stopPropagation();
    if (isMyStory) return;
    if (votedOption && story.voteChanged) return; // Prevent if already changed
    setVotedOption(option);
    onVote(story.id, option);
  };

  const totalVotes = story.votesA + story.votesB;
  const percentA = totalVotes > 0 ? Math.round((story.votesA / totalVotes) * 100) : 0;
  const percentB = totalVotes > 0 ? 100 - percentA : 0;
  const isZeroVotes = totalVotes === 0;

  return (
    <article
      onClick={() => {
        if (isBlurRequired && onRequireAdultVerification) {
          onRequireAdultVerification();
        } else {
          onSelect(story);
        }
      }}
      className="bg-white border border-[#E5E7EB] group hover:border-[#3ECF8E] transition-all duration-300 flex flex-col cursor-pointer rounded-lg overflow-hidden shadow-xs hover:-translate-y-1 relative"
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
            {story.isAdult && isUserAdultVerified && (
              <span className="flex items-center justify-center w-5 h-5 bg-red-50 border border-red-200 text-red-500 rounded text-[10px] font-black ml-0.5">19</span>
            )}
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

        {/* Title and Excerpt Body with conditional blur */}
        <div className="relative mb-6">
          <div className={isBlurRequired ? "blur-[6px] select-none pointer-events-none opacity-60 transition-all" : ""}>
            <h4 className="font-headline-md text-base sm:text-lg font-bold text-[#1C1C1C] mb-3 group-hover:text-[#3ECF8E] transition-colors leading-snug">
              {story.title}
            </h4>
            <p className="text-[#5f5e5e] font-body-sm text-xs sm:text-sm line-clamp-3 leading-relaxed">
              {story.body}
            </p>
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
          <div className="flex justify-between font-label-sm text-xs mb-2">
            <span className="text-[#3ECF8E] font-bold">A. 내편 ({percentA}%)</span>
            <span className="text-[#5f5e5e]">B. 상대편 ({percentB}%)</span>
          </div>

          <div className="flex w-full h-2 rounded-full overflow-hidden bg-[#f3f4f5] mb-3">
            {isZeroVotes ? (
              <div className="bg-[#E5E7EB] w-full h-full"></div>
            ) : (
              <>
                <div className="bg-[#3ECF8E] h-full vote-bar-progress" style={{ width: `${percentA}%` }}></div>
                <div className="bg-[#5f5e5e]/20 h-full vote-bar-progress" style={{ width: `${percentB}%` }}></div>
              </>
            )}
          </div>

          {/* Quick Vote Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              onClick={(e) => handleVoteClick(e, 'A')}
              disabled={isMyStory || (!!votedOption && !!story.voteChanged)}
              className={`py-2 px-3 rounded-lg font-label-sm text-xs font-bold transition-all ${
                votedOption === 'A'
                  ? 'bg-[#3ECF8E] text-[#1C1C1C] cursor-default'
                  : isMyStory
                  ? 'bg-[#f3f4f5] text-[#5f5e5e]/50 cursor-not-allowed'
                  : 'bg-[#f3f4f5] text-[#1C1C1C] hover:bg-[#3ECF8E]/20 cursor-pointer'
              }`}
            >
              내편 투표
            </button>
            <button
              onClick={(e) => handleVoteClick(e, 'B')}
              disabled={isMyStory || (!!votedOption && !!story.voteChanged)}
              className={`py-2 px-3 rounded-lg font-label-sm text-xs font-bold transition-all ${
                votedOption === 'B'
                  ? 'bg-[#1C1C1C] text-white cursor-default'
                  : isMyStory
                  ? 'bg-[#f3f4f5] text-[#5f5e5e]/50 cursor-not-allowed'
                  : 'bg-[#f3f4f5] text-[#1C1C1C] hover:bg-[#1C1C1C]/10 cursor-pointer'
              }`}
            >
              상대편 투표
            </button>
          </div>
          {isMyStory && (
            <p className="text-[11px] text-[#5f5e5e] text-center mb-3 font-semibold">
              ※ 내가 작성한 사연은 여론 확인만 가능합니다.
            </p>
          )}
        </div>
      </div>

      {/* Card Footer Info */}
      <div className="p-4 px-6 bg-white border-t border-[#E5E7EB] flex items-center gap-4">
        <span className="flex items-center gap-1 text-[#5f5e5e] font-label-sm text-xs">
          <span className="material-symbols-outlined text-[18px]">forum</span> {story.commentCount}
        </span>
        <span className="flex items-center gap-1 text-[#5f5e5e] font-label-sm text-xs">
          <span className="material-symbols-outlined text-[18px]">how_to_vote</span> {totalVotes}
        </span>
      </div>
    </article>
  );
};


