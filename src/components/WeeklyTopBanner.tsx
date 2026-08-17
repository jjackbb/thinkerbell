import React, { useState, useEffect } from 'react';
import { Story } from '../types';
import { Trophy, Zap, ChevronLeft, ChevronRight } from 'lucide-react';

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

  const toggleBanner = () => {
    setActiveBanner(prev => prev === 'weekly' ? 'realtime' : 'weekly');
  };

  if (!weeklyTopStories || weeklyTopStories.length === 0) return null;

  const renderStories = (stories: Story[], bannerType: 'weekly' | 'realtime') => {
    return stories.slice(0, 3).map((story, idx) => {
      const total = story.votesA + story.votesB;
      const percentageA = total > 0 ? Math.round((story.votesA / total) * 100) : 50;
      const rankColor = 'bg-[#B87514] text-white';
      const inactiveRankColor = 'bg-[#1C1C1C] text-white';

      return (
        <div
          key={`${bannerType}-${story.id}`}
          onClick={() => onSelectStory(story)}
          className="bg-white border border-[#B87514] rounded-lg p-4 cursor-pointer transition-all flex flex-col justify-between hover:shadow-xs"
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
            {/* 왼쪽이 니 편, 오른쪽이 내 편 */}
            <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden flex mb-2">
              <div
                className="bg-[#6C7BE8] h-full transition-all duration-500"
                style={{ width: `${100 - percentageA}%` }}
              />
              <div
                className="bg-[#FF6B5A] h-full transition-all duration-500"
                style={{ width: `${percentageA}%` }}
              />
            </div>

            <div className="flex items-center justify-between font-mono text-[11px] text-[#5f5e5e]">
              <span className="text-[#4553C4] font-bold">니편 {100 - percentageA}%</span>
              <span>{total}표</span>
              <span className="text-[#D6452F] font-bold">내편 {percentageA}%</span>
            </div>
          </div>
        </div>
      );
    });
  };

  // Calculate current week date range (Monday to Sunday)
  const getWeeklyDateRangeString = () => {
    const today = new Date();
    const day = today.getDay(); // 0: Sun, 1: Mon, ...
    const distToMon = (day + 6) % 7;
    const mon = new Date(today);
    mon.setDate(today.getDate() - distToMon);

    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);

    const monMonth = mon.getMonth() + 1;
    const monDate = mon.getDate();
    const sunMonth = sun.getMonth() + 1;
    const sunDate = sun.getDate();

    return `${monMonth}.${monDate}.(월)-${sunMonth}.${sunDate}.(일)`;
  };

  // Calculate hourly reference time string (e.g. "18:00 기준")
  const getRealtimeHourString = () => {
    const hours = new Date().getHours();
    const formattedHour = String(hours).padStart(2, '0');
    return `${formattedHour}:00 기준`;
  };

  const dateRangeStr = getWeeklyDateRangeString();
  const realtimeHourStr = getRealtimeHourString();

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 mb-8 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between mb-4 border-b border-[#E5E7EB] pb-3">
        <div className="flex items-center gap-2 relative h-8 w-full max-w-[450px] overflow-hidden">
          {/* Weekly Header */}
          <div className={`absolute inset-0 flex items-center gap-2 transition-transform duration-500 ${activeBanner === 'weekly' ? 'translate-y-0' : '-translate-y-full'}`}>
            <div className="w-7 h-7 bg-[#B87514]/10 rounded flex items-center justify-center text-[#B87514] font-bold shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-[#1C1C1C] flex items-center gap-2 font-headline-md whitespace-nowrap">
              주간 랭킹 TOP 3
              <span className="text-xs px-2 py-0.5 bg-[#B87514] text-white font-mono rounded font-bold ml-1">{dateRangeStr}</span>
            </h2>
          </div>
          
          {/* Realtime Header */}
          <div className={`absolute inset-0 flex items-center gap-2 transition-transform duration-500 ${activeBanner === 'realtime' ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="w-7 h-7 bg-[#B87514]/10 rounded flex items-center justify-center text-[#B87514] font-bold shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-[#1C1C1C] flex items-center gap-2 font-headline-md whitespace-nowrap">
              실시간 랭킹 TOP 3
              <span className="text-xs px-2 py-0.5 bg-[#B87514] text-white font-mono rounded font-bold ml-1">{realtimeHourStr}</span>
            </h2>
          </div>
        </div>

        {/* Arrow Navigation Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleBanner}
            className="p-1 rounded-md text-[#5f5e5e] hover:text-[#1C1C1C] hover:bg-[#f3f4f5] transition-colors cursor-pointer"
            aria-label="이전 배너 보기"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={toggleBanner}
            className="p-1 rounded-md text-[#5f5e5e] hover:text-[#1C1C1C] hover:bg-[#f3f4f5] transition-colors cursor-pointer"
            aria-label="다음 배너 보기"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
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
            className={`w-2 h-2 rounded-full transition-all cursor-pointer ${activeBanner === 'weekly' ? 'bg-[#B87514] w-4' : 'bg-[#E5E7EB]'}`} 
            aria-label="주간 랭킹 보기"
          />
          <button 
            onClick={() => setActiveBanner('realtime')} 
            className={`w-2 h-2 rounded-full transition-all cursor-pointer ${activeBanner === 'realtime' ? 'bg-[#B87514] w-4' : 'bg-[#E5E7EB]'}`} 
            aria-label="실시간 랭킹 보기"
          />
        </div>
      </div>
    </div>
  );
};


