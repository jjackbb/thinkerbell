import React, { useState, useEffect } from 'react';
import { Story, UserProfile } from '../types';
import { VoteResult } from './VoteResult';
import { ownsStory } from '../lib/storyOwnership';
import { Trophy, Zap, ChevronLeft, ChevronRight } from 'lucide-react';

interface WeeklyTopBannerProps {
  weeklyTopStories: Story[];
  realtimeTopStories?: Story[];
  onSelectStory: (story: Story) => void;
  currentUser?: UserProfile;
  isGuest?: boolean;
}

export const WeeklyTopBanner: React.FC<WeeklyTopBannerProps> = ({
  weeklyTopStories,
  realtimeTopStories = [],
  onSelectStory,
  currentUser,
  isGuest = false,
}) => {
  /*
    보여줄 수 있는 칸만 모은다.

    예전에는 주간 목록이 비면 배너 전체가 `null`이었다. 그래서 이번 주에 올라온
    사연이 하나도 없는 동안(지금이 그렇다 — DB의 사연은 전부 7월 것이다)
    **보여줄 데이터가 멀쩡히 있는 '실시간 랭킹'까지 같이 사라졌다.**
    첫 화면 위쪽이 통째로 비어 보였던 이유다.

    이제는 내용이 있는 칸만 골라 넣는다. 주간이 비면 실시간 한 칸짜리 배너가 되고,
    누군가 이번 주에 사연을 쓰면 주간 칸이 다시 생긴다.
  */
  const panes = [
    ...(weeklyTopStories && weeklyTopStories.length > 0
      ? [{ key: 'weekly' as const, stories: weeklyTopStories }]
      : []),
    ...(realtimeTopStories && realtimeTopStories.length > 0
      ? [{ key: 'realtime' as const, stories: realtimeTopStories }]
      : []),
  ];
  const paneCount = panes.length;

  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  /* 칸이 줄어들면(주간이 사라지면) 보고 있던 자리가 없어질 수 있다 */
  useEffect(() => {
    if (paneCount > 0 && activeIndex > paneCount - 1) setActiveIndex(0);
  }, [paneCount, activeIndex]);

  /* 칸이 하나뿐이면 넘길 곳이 없으므로 타이머를 걸지 않는다 */
  useEffect(() => {
    if (paneCount < 2) return;
    const timer = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % paneCount);
    }, 20000);
    return () => clearInterval(timer);
  }, [paneCount]);

  const handleDragStart = (clientX: number) => {
    setTouchStartX(clientX);
  };

  const handleDragMove = (clientX: number) => {
    if (touchStartX === null || paneCount < 2) return;
    const diff = touchStartX - clientX;

    if (diff > 50) {
      setActiveIndex(prev => Math.min(prev + 1, paneCount - 1));
      setTouchStartX(null);
    } else if (diff < -50) {
      setActiveIndex(prev => Math.max(prev - 1, 0));
      setTouchStartX(null);
    }
  };

  const handleDragEnd = () => {
    setTouchStartX(null);
  };

  const toggleBanner = () => {
    if (paneCount < 2) return;
    setActiveIndex(prev => (prev + 1) % paneCount);
  };

  if (paneCount === 0) return null;

  const safeIndex = Math.min(activeIndex, paneCount - 1);

  const renderStories = (stories: Story[], bannerType: 'weekly' | 'realtime') => {
    return stories.slice(0, 3).map((story, idx) => {
      const rankColor = 'bg-[#B87514] text-white';
      const inactiveRankColor = 'bg-[#1C1C1C] text-white';

      return (
        <button type="button" data-action-id="weekly-top-banner-action-01" data-button-id="weekly-top-banner-action-01" data-analytics-exclude={story.visibility === "private" || story.isAdult || story.isBlind || story.isHidden ? "true" : undefined}
          key={`${bannerType}-${story.id}`}
          onClick={() => onSelectStory(story)}
          className="bg-white border border-[#B87514] rounded-lg p-4 text-left cursor-pointer transition-all flex flex-col justify-between hover:shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B87514]"
        >
          <div>
            <div className="flex items-center justify-between mb-2 font-mono text-xs">
              <span className={`px-2 py-0.5 rounded font-bold ${idx === 0 ? rankColor : inactiveRankColor}`}>
                #{idx + 1}
              </span>
              <span className="text-[#5f5e5e] font-semibold">{story.category}</span>
            </div>

            <h3 className="text-sm font-bold text-[#1C1C1C] line-clamp-2 leading-snug mb-3">
              {story.title}
            </h3>
          </div>

          <div>
            <VoteResult
              votesA={story.votesA}
              votesB={story.votesB}
              hasVoted={!isGuest && !!story.userVoted}
              isMyStory={ownsStory(currentUser?.id, story.authorId, isGuest)}
              compact
            />
          </div>
        </button>
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

  const paneLabel = (key: 'weekly' | 'realtime') =>
    key === 'weekly' ? '주간 랭킹 보기' : '실시간 랭킹 보기';

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 mb-8 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between mb-4 border-b border-[#E5E7EB] pb-3">
        <div className="flex items-center gap-2 relative h-14 sm:h-8 w-full max-w-[450px] overflow-hidden">
          {panes.map((pane, idx) => (
            <div
              key={`header-${pane.key}`}
              aria-hidden={idx !== safeIndex}
              className={`absolute inset-0 flex items-center gap-2 transition-transform duration-500 ${
                idx === safeIndex ? 'translate-y-0' : idx < safeIndex ? '-translate-y-full' : 'translate-y-full'
              }`}
            >
              <div className="w-7 h-7 bg-[#B87514]/10 rounded flex items-center justify-center text-[#B87514] font-bold shrink-0">
                {pane.key === 'weekly' ? <Trophy className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#1C1C1C] flex flex-wrap items-center gap-x-2 gap-y-1 font-headline-md">
                {pane.key === 'weekly' ? '주간 랭킹 TOP 3' : '실시간 랭킹 TOP 3'}
                <span className="text-xs px-2 py-0.5 bg-[#B87514] text-white font-mono rounded font-bold ml-1">
                  {pane.key === 'weekly' ? dateRangeStr : realtimeHourStr}
                </span>
              </h2>
            </div>
          ))}
        </div>

        {/* 넘길 칸이 둘 이상일 때만 화살표를 낸다 */}
        {paneCount > 1 && (
          <div className="flex items-center gap-1 shrink-0">
            <button data-button-id="weekly-top-banner-button-01"
              onClick={toggleBanner}
              className="p-2 rounded-md text-[#5f5e5e] hover:text-[#1C1C1C] hover:bg-[#f3f4f5] transition-colors cursor-pointer"
              aria-label="이전 배너 보기"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button data-button-id="weekly-top-banner-button-02"
              onClick={toggleBanner}
              className="p-2 rounded-md text-[#5f5e5e] hover:text-[#1C1C1C] hover:bg-[#f3f4f5] transition-colors cursor-pointer"
              aria-label="다음 배너 보기"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
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
          style={{
            width: `${paneCount * 100}%`,
            transform: `translateX(-${safeIndex * (100 / paneCount)}%)`,
          }}
        >
          {panes.map(pane => (
            <div
              key={`pane-${pane.key}`}
              aria-hidden={pane.key !== panes[safeIndex].key}
              inert={pane.key !== panes[safeIndex].key}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0 px-0.5"
              style={{ width: `${100 / paneCount}%` }}
            >
              {renderStories(pane.stories, pane.key)}
            </div>
          ))}
        </div>
      </div>

      {/* 점도 칸이 둘 이상일 때만 의미가 있다 */}
      {paneCount > 1 && (
        <div className="flex justify-center mt-4">
          <div className="flex items-center gap-1.5">
            {panes.map((pane, idx) => (
              <button data-button-id="weekly-top-banner-self-button-01"
                key={`dot-${pane.key}`}
                onClick={() => setActiveIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                  idx === safeIndex ? 'bg-[#B87514] w-4' : 'bg-[#E5E7EB]'
                }`}
                aria-label={paneLabel(pane.key)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
