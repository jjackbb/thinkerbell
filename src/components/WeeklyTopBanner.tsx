import React from 'react';
import { Story } from '../types';
import { Trophy } from 'lucide-react';

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
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 mb-8 shadow-xs">
      <div className="flex items-center justify-between mb-4 border-b border-[#E5E7EB] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#3ECF8E]/10 rounded flex items-center justify-center text-[#3ECF8E] font-bold">
            <Trophy className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-[#1C1C1C] flex items-center gap-2 font-headline-md">
            주간 랭킹 TOP 3 <span className="text-xs px-2 py-0.5 bg-[#3ECF8E] text-[#1C1C1C] font-mono rounded font-bold">WEEKLY</span>
          </h2>
        </div>
        <span className="font-mono text-xs text-[#5f5e5e]">MOST VOTED LOGIC</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {weeklyTopStories.slice(0, 3).map((story, idx) => {
          const total = story.votesA + story.votesB;
          const percentageA = total > 0 ? Math.round((story.votesA / total) * 100) : 50;
          
          return (
            <div
              key={story.id}
              onClick={() => onSelectStory(story)}
              className="bg-[#f3f4f5] hover:bg-white border border-[#E5E7EB] hover:border-[#3ECF8E] rounded-lg p-4 cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2 font-mono text-xs">
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    idx === 0 ? 'bg-[#3ECF8E] text-[#1C1C1C]' : 'bg-[#1C1C1C] text-white'
                  }`}>
                    #{idx + 1}
                  </span>
                  <span className="text-[#5f5e5e] font-semibold">{story.category}</span>
                </div>

                <h3 className="text-xs sm:text-sm font-bold text-[#1C1C1C] line-clamp-2 leading-snug mb-3">
                  {story.title}
                </h3>
              </div>

              <div>
                {/* Vote Percentage Gauge */}
                <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden flex mb-2">
                  <div
                    className="bg-[#3ECF8E] h-full transition-all duration-500"
                    style={{ width: `${percentageA}%` }}
                  />
                  <div
                    className="bg-[#5f5e5e]/20 h-full transition-all duration-500"
                    style={{ width: `${100 - percentageA}%` }}
                  />
                </div>

                <div className="flex items-center justify-between font-mono text-[11px] text-[#5f5e5e]">
                  <span className="text-[#3ECF8E] font-bold">내편 {percentageA}%</span>
                  <span>{total}표</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


