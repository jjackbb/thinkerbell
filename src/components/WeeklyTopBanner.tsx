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
            {/*
              표가 하나도 없으면 비율을 그리지 않는다.

              예전에는 0표일 때도 50:50 막대가 그려졌다. 아무도 안 골랐는데
              화면은 "팽팽하다"고 말하는 셈이라, 없는 여론을 지어내는 것과 같다.
              빈 막대와 '아직 표 없음'으로 사실만 말한다.
            */}
            {total === 0 ? (
              <>
                <div className="w-full bg-[#E5E7EB] h-2 rounded-full mb-2" />
                <div className="flex items-center justify-center font-mono text-[11px] text-[#5f5e5e]">
                  <span>아직 표 없음</span>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
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

  const paneLabel = (key: 'weekly' | 'realtime') =>
    key === 'weekly' ? '주간 랭킹 보기' : '실시간 랭킹 보기';

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 mb-8 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between mb-4 border-b border-[#E5E7EB] pb-3">
        <div className="flex items-center gap-2 relative h-8 w-full max-w-[450px] overflow-hidden">
          {panes.map((pane, idx) => (
            <div
              key={`header-${pane.key}`}
              className={`absolute inset-0 flex items-center gap-2 transition-transform duration-500 ${
                idx === safeIndex ? 'translate-y-0' : idx < safeIndex ? '-translate-y-full' : 'translate-y-full'
              }`}
            >
              <div className="w-7 h-7 bg-[#B87514]/10 rounded flex items-center justify-center text-[#B87514] font-bold shrink-0">
                {pane.key === 'weekly' ? <Trophy className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
              </div>
              <h2 className="text-base font-bold text-[#1C1C1C] flex items-center gap-2 font-headline-md whitespace-nowrap">
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
              <button
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
