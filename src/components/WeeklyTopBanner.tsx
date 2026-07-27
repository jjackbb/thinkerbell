import React, { useState, useEffect } from 'react';
import { Story } from '../types';
import { Trophy, Zap } from 'lucide-react';

interface WeeklyTopBannerProps {
  weeklyTopStories: Story[];
  realtimeTopStories?: Story[];
  onSelectStory: (story: Story) => void;
}

export const WeeklyTopBanner: React.FC<WeeklyTopBannerProps> = ({
  weeklyTopStories,
  realtimeTopStories = [],
  onSelectStory,
}) => {
  const [activeBanner, setActiveBanner] = useState<'weekly' | 'realtime'>('weekly');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBanner(prev => prev === 'weekly' ? 'realtime' : 'weekly');
    }, 20000);
    return () => clearInterval(timer);
  }, []);

  const handleDragStart = (clientX: number) => {
    setTouchStartX(clientX);
  };

  const handleDragMove = (clientX: number) => {
    if (touchStartX === null) return;
    const diff = touchStartX - clientX;
    
    if (diff > 50) {
      setActiveBanner('realtime');
      setTouchStartX(null);
    } else if (diff < -50) {
      setActiveBanner('weekly');
      setTouchStartX(null);
    }
  };

  const handleDragEnd = () => {
    setTouchStartX(null);
  };

  if (!weeklyTopStories || weeklyTopStories.length === 0) return null;

  const renderStories = (stories: Story[], bannerType: 'weekly' | 'realtime') => {
    return stories.slice(0, 3).map((story, idx) => {
      const total = story.votesA + story.votesB;
      const percentageA = total > 0 ? Math.round((story.votesA / total) * 100) : 50;
      const rankColor = bannerType === 'weekly' ? 'bg-[#3ECF8E] text-[#1C1C1C]' : 'bg-[#FF5C00] text-white';
      const inactiveRankColor = 'bg-[#1C1C1C] text-white';

      return (
        <div
          key={`${bannerType}-${story.id}`}
          onClick={() => onSelectStory(story)}
          className={`bg-[#f3f4f5] hover:bg-white border border-[#E5E7EB] ${bannerType === 'weekly' ? 'hover:border-[#3ECF8E]' : 'hover:border-[#FF5C00]'} rounded-lg p-4 cursor-pointer transition-all flex flex-col justify-between`}
        >
          <div>
            <div className="flex items-center justify-between mb-2 font-mono text-xs">
              <span className={`px-2 py-0.5 rounded font-bold ${idx === 0 ? rankColor : inactiveRankColor}`}>
                #{idx + 1}
              </span>
              <span className="text-[#5f5e5e] font-semibold">{story.category}</span>
            </div>

            <h3 className="text-xs sm:text-sm font-bold text-[#1C1C1C] line-clamp-2 leading-snug mb-3">
              {story.title}
            </h3>
          </div>

          <div>
            <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden flex mb-2">
              <div
                className={`${bannerType === 'weekly' ? 'bg-[#3ECF8E]' : 'bg-[#FF5C00]'} h-full transition-all duration-500`}
                style={{ width: `${percentageA}%` }}
              />
              <div
                className="bg-[#5f5e5e]/20 h-full transition-all duration-500"
                style={{ width: `${100 - percentageA}%` }}
              />
            </div>

            <div className="flex items-center justify-between font-mono text-[11px] text-[#5f5e5e]">
              <span className={`${bannerType === 'weekly' ? 'text-[#3ECF8E]' : 'text-[#FF5C00]'} font-bold`}>내편 {percentageA}%</span>
              <span>{total}표</span>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 mb-8 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between mb-4 border-b border-[#E5E7EB] pb-3">
        <div className="flex items-center gap-2 relative h-8 w-64 overflow-hidden">
          {/* Weekly Header */}
          <div className={`absolute inset-0 flex items-center gap-2 transition-transform duration-500 ${activeBanner === 'weekly' ? 'translate-y-0' : '-translate-y-full'}`}>
            <div className="w-7 h-7 bg-[#3ECF8E]/10 rounded flex items-center justify-center text-[#3ECF8E] font-bold">
              <Trophy className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-[#1C1C1C] flex items-center gap-2 font-headline-md whitespace-nowrap">
              주간 랭킹 TOP 3 <span className="text-xs px-2 py-0.5 bg-[#3ECF8E] text-[#1C1C1C] font-mono rounded font-bold ml-1">WEEKLY</span>
            </h2>
          </div>
          
          {/* Realtime Header */}
          <div className={`absolute inset-0 flex items-center gap-2 transition-transform duration-500 ${activeBanner === 'realtime' ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="w-7 h-7 bg-[#FF5C00]/10 rounded flex items-center justify-center text-[#FF5C00] font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-[#1C1C1C] flex items-center gap-2 font-headline-md whitespace-nowrap">
              실시간 랭킹 TOP 3 <span className="text-xs px-2 py-0.5 bg-[#FF5C00] text-white font-mono rounded font-bold ml-1">REAL-TIME</span>
            </h2>
          </div>
        </div>
      </div>

      <div 
        className="relative overflow-hidden w-full"
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
        onTouchEnd={handleDragEnd}
        onMouseDown={(e) => handleDragStart(e.clientX)}
        onMouseMove={(e) => handleDragMove(e.clientX)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        <div 
          className="flex transition-transform duration-700 ease-in-out" 
          style={{ width: '200%', transform: activeBanner === 'weekly' ? 'translateX(0)' : 'translateX(-50%)' }}
        >
          {/* Weekly Banner Content */}
          <div className="w-1/2 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0 px-0.5">
            {renderStories(weeklyTopStories, 'weekly')}
          </div>

          {/* Realtime Banner Content */}
          <div className="w-1/2 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0 px-0.5">
            {renderStories(realtimeTopStories, 'realtime')}
          </div>
        </div>
      </div>

      {/* Indicator dots at the bottom center */}
      <div className="flex justify-center mt-4">
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setActiveBanner('weekly')} 
            className={`w-2 h-2 rounded-full transition-all cursor-pointer ${activeBanner === 'weekly' ? 'bg-[#3ECF8E] w-4' : 'bg-[#E5E7EB]'}`} 
            aria-label="주간 랭킹 보기"
          />
          <button 
            onClick={() => setActiveBanner('realtime')} 
            className={`w-2 h-2 rounded-full transition-all cursor-pointer ${activeBanner === 'realtime' ? 'bg-[#FF5C00] w-4' : 'bg-[#E5E7EB]'}`} 
            aria-label="실시간 랭킹 보기"
          />
        </div>
      </div>
    </div>
  );
};


