import React from 'react';
import { Story } from '../types';
import { Trophy, Flame, ChevronRight, ThumbsUp } from 'lucide-react';

interface WeeklyTopBannerProps {
  weeklyTopStories: Story[];
  onSelectStory: (story: Story) => void;
}

export const WeeklyTopBanner: React.FC<WeeklyTopBannerProps> = ({
  weeklyTopStories,
  onSelectStory,
}) => {
  if (!weeklyTopStories || weeklyTopStories.length === 0) return null;

  return (
    <div className="bg-[#f5f0e0] border border-[#e8e2d0] rounded-2xl p-4 mb-6 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#e8b94a] flex items-center justify-center text-white font-bold">
            <Trophy className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-[#0a0a0a] flex items-center gap-1.5 font-display">
            주간 랭킹 TOP 3 <Flame className="w-4 h-4 text-[#ff4d8b] fill-current" />
          </h2>
        </div>
        <span className="text-xs text-[#6a6a6a] font-medium">이번 주 가장 공감받은 사연</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {weeklyTopStories.slice(0, 3).map((story, idx) => {
          const total = story.votesA + story.votesB;
          const percentageA = total > 0 ? Math.round((story.votesA / total) * 100) : 50;
          
          return (
            <div
              key={story.id}
              onClick={() => onSelectStory(story)}
              className="bg-[#fffaf0] hover:bg-[#faf5e8] border border-[#e8e2d0] rounded-xl p-3 cursor-pointer transition-all hover:-translate-y-0.5 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-black px-2 py-0.5 rounded-md text-white ${
                    idx === 0 ? 'bg-[#ff4d8b]' : idx === 1 ? 'bg-[#1a3a3a]' : 'bg-[#e8b94a]'
                  }`}>
                    #{idx + 1}위
                  </span>
                  <span className="text-[11px] font-semibold text-[#6a6a6a]">
                    {story.category}
                  </span>
                </div>

                <h3 className="text-xs font-bold text-[#0a0a0a] line-clamp-2 leading-snug mb-2">
                  {story.title}
                </h3>
              </div>

              <div>
                {/* Vote Percentage Gauge */}
                <div className="w-full bg-[#ebe6d6] h-2 rounded-full overflow-hidden flex mb-1.5">
                  <div
                    className="bg-[#ff4d8b] h-full transition-all duration-500"
                    style={{ width: `${percentageA}%` }}
                  />
                  <div
                    className="bg-[#1a3a3a] h-full transition-all duration-500"
                    style={{ width: `${100 - percentageA}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#6a6a6a]">
                  <span className="font-bold text-[#ff4d8b]">내편 {percentageA}%</span>
                  <span className="flex items-center gap-1 font-medium">
                    <ThumbsUp className="w-3 h-3 text-[#1a3a3a]" /> {total}표 참여
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
