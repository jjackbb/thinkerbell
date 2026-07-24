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
    <div className="bg-white border-2 border-black p-4 mb-6 elevated-tile">
      <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#e21500] border border-black flex items-center justify-center text-white font-black">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-base font-black text-black flex items-center gap-1.5 uppercase tracking-tight">
            WEEKLY TOP 3 <span className="text-[#e21500]">RANKING</span>
          </h2>
        </div>
        <span className="font-mono text-xs text-[#5e5e5e] font-black uppercase">MOST SUPPORTED</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {weeklyTopStories.slice(0, 3).map((story, idx) => {
          const total = story.votesA + story.votesB;
          const percentageA = total > 0 ? Math.round((story.votesA / total) * 100) : 50;
          
          return (
            <div
              key={story.id}
              onClick={() => onSelectStory(story)}
              className="bg-white hover:bg-[#f5f5f5] border-2 border-black p-3 cursor-pointer transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5 font-mono">
                  <span className={`text-[10px] font-black px-2 py-0.5 text-white border border-black ${
                    idx === 0 ? 'bg-[#e21500]' : idx === 1 ? 'bg-black' : 'bg-[#5e5e5e]'
                  }`}>
                    RANK #{idx + 1}
                  </span>
                  <span className="text-[10px] font-bold text-[#5e5e5e] uppercase">
                    {story.category}
                  </span>
                </div>

                <h3 className="text-xs font-black text-black line-clamp-2 leading-snug mb-2">
                  {story.title}
                </h3>
              </div>

              <div>
                {/* Vote Percentage Gauge */}
                <div className="w-full bg-white border border-black h-2.5 flex overflow-hidden mb-1.5">
                  <div
                    className="bg-[#e21500] h-full transition-all duration-500"
                    style={{ width: `${percentageA}%` }}
                  />
                  <div
                    className="bg-black h-full transition-all duration-500"
                    style={{ width: `${100 - percentageA}%` }}
                  />
                </div>

                <div className="flex items-center justify-between font-mono text-[10px] font-black">
                  <span className="text-[#e21500]">내편 {percentageA}%</span>
                  <span className="text-black">{total} VOTES</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

