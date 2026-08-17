import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const BALANCE_GAMES = [
  {
    id: 1,
    question: 'Q. 금요일 퇴근 10분 전, "이거 월요일 오전에 보고해야 하니까 지금 좀 부탁해~" 라며 일을 던지고 먼저 퇴근하는 상사, 어떻게 할까요?',
    desc: '직장인들의 퇴근 시간을 위협하는 상황, 당신의 선택은?',
    optA: '뚝배기 🔨',
    optB: '그럴 수 있지~',
    initialVotesA: 782,
    initialVotesB: 218
  },
  {
    id: 2,
    question: 'Q. 주말에 팀장님이 개인 톡으로 가벼운 업무 지시를 내린다면?',
    desc: '주말 휴식을 깨는 상사의 카톡, 어떻게 대처하시겠습니까?',
    optA: '일단 읽씹 📱',
    optB: '바로 답장 🏃',
    initialVotesA: 450,
    initialVotesB: 550
  },
  {
    id: 3,
    question: 'Q. 애인이 절친한 이성 친구와 단둘이 당일치기 여행을 간다고 한다면?',
    desc: '연인 사이의 이성 친구 문제, 어디까지 허용 가능할까요?',
    optA: '절대 안 돼 🙅',
    optB: '쿨하게 허락 🤷',
    initialVotesA: 820,
    initialVotesB: 180
  }
];

export const BalanceGameSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // 상태를 각 게임별로 관리
  const [gamesState, setGamesState] = useState(() => 
    BALANCE_GAMES.map(g => ({
      selectedOption: null as 'A' | 'B' | null,
      votes: { A: g.initialVotesA, B: g.initialVotesB },
    }))
  );

  const confirmedOptionsRef = useRef<Array<'A' | 'B' | null>>([null, null, null]);
  const timersRef = useRef<Array<NodeJS.Timeout | null>>([null, null, null]);
  
  // 자동 롤링 타이머
  const [isHovered, setIsHovered] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (isHovered) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BALANCE_GAMES.length);
    }, 15000);
    return () => clearInterval(timer);
  }, [isHovered]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % BALANCE_GAMES.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + BALANCE_GAMES.length) % BALANCE_GAMES.length);
  };

  const handleDragStart = (clientX: number) => {
    touchStartX.current = clientX;
  };

  const handleDragMove = (clientX: number) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - clientX;
    
    if (diff > 50) {
      handleNext();
      touchStartX.current = null;
    } else if (diff < -50) {
      handlePrev();
      touchStartX.current = null;
    }
  };

  const handleDragEnd = () => {
    touchStartX.current = null;
  };

  const handleVote = (gameIndex: number, option: 'A' | 'B') => {
    // 같은 선택지를 다시 누르면 투표를 취소한다
    const nextSelection = gamesState[gameIndex].selectedOption === option ? null : option;

    setGamesState(prev => {
      const newState = [...prev];
      newState[gameIndex] = { ...newState[gameIndex], selectedOption: nextSelection };
      return newState;
    });

    if (timersRef.current[gameIndex]) {
      clearTimeout(timersRef.current[gameIndex]!);
    }

    timersRef.current[gameIndex] = setTimeout(() => {
      setGamesState(prev => {
        const prevConfirmed = confirmedOptionsRef.current[gameIndex];
        if (prevConfirmed === nextSelection) return prev;

        const newState = [...prev];
        const newVotes = { ...newState[gameIndex].votes };

        if (prevConfirmed) newVotes[prevConfirmed] -= 1;
        if (nextSelection) newVotes[nextSelection] += 1;

        confirmedOptionsRef.current[gameIndex] = nextSelection;
        newState[gameIndex] = { ...newState[gameIndex], votes: newVotes };
        return newState;
      });
    }, 10000);
  };

  return (
    <section 
      className="mb-10 relative overflow-hidden bg-[#1C1C1C] rounded-lg border border-[#1C1C1C]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); handleDragEnd(); }}
      onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
      onTouchEnd={handleDragEnd}
      onMouseDown={(e) => handleDragStart(e.clientX)}
      onMouseMove={(e) => handleDragMove(e.clientX)}
      onMouseUp={handleDragEnd}
    >
      {/* 화살표 및 타이틀 상단 바 */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between z-20">
        <div className="inline-block px-3 py-1 bg-[#FF6B5A]/10 border border-[#FF6B5A]/20 rounded text-[#FF6B5A] font-mono text-xs">
          오늘의 밸런스 게임
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="이전 배너 보기"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="다음 배너 보기"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div 
        className="flex transition-transform duration-700 ease-in-out h-full pt-13 pb-5"
        style={{ width: `${BALANCE_GAMES.length * 100}%`, transform: `translateX(-${(currentIndex * 100) / BALANCE_GAMES.length}%)` }}
      >
        {BALANCE_GAMES.map((game, idx) => {
          const state = gamesState[idx];
          const total = state.votes.A + state.votes.B;
          const percentA = total > 0 ? Math.round((state.votes.A / total) * 100) : 50;
          const percentB = 100 - percentA;

          return (
            <div key={game.id} className="w-full flex flex-col md:flex-row gap-4 md:gap-6 items-center px-6 py-2 md:px-8 shrink-0" style={{ width: `${100 / BALANCE_GAMES.length}%` }}>
              <div className="flex-1 z-10 w-full">
                <h3 className="font-headline-lg text-base sm:text-lg font-bold text-white leading-snug">
                  {game.question}
                </h3>
              </div>

              {/* 결과 비율 바 + 투표 버튼 (사연 피드 카드와 동일한 구성) */}
              <div className="w-full md:w-72 z-10 font-mono">
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-[#FF6B5A]">{game.optA} ({percentA}%)</span>
                  <span className="text-white/50">{game.optB} ({percentB}%)</span>
                </div>

                <div className="flex w-full h-2 rounded-full overflow-hidden bg-white/10 mb-3">
                  <div className="bg-[#FF6B5A] h-full transition-all duration-500" style={{ width: `${percentA}%` }}></div>
                  <div className="bg-white/40 h-full transition-all duration-500" style={{ width: `${percentB}%` }}></div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleVote(idx, 'A')}
                    aria-pressed={state.selectedOption === 'A'}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      state.selectedOption === 'A'
                        ? 'bg-[#FF6B5A] text-[#1C1C1C]'
                        : 'bg-white/10 text-white hover:bg-[#FF6B5A]/20'
                    }`}
                  >
                    {game.optA}
                  </button>
                  <button
                    onClick={() => handleVote(idx, 'B')}
                    aria-pressed={state.selectedOption === 'B'}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      state.selectedOption === 'B'
                        ? 'bg-white text-[#1C1C1C]'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {game.optB}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Indicator dots at the bottom center */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
        <div className="flex items-center gap-1.5">
          {BALANCE_GAMES.map((_, idx) => (
            <button 
              key={idx}
              onClick={() => setCurrentIndex(idx)} 
              className={`h-2 rounded-full transition-all cursor-pointer ${currentIndex === idx ? 'bg-[#FF6B5A] w-4' : 'bg-white/20 w-2'}`} 
              aria-label={`밸런스 게임 ${idx + 1} 보기`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};


