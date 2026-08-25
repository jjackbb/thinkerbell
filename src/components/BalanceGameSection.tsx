import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { VoteResult } from './VoteResult';

/**
 * 질문은 코드에 둔다. 표만 DB(public.balance_votes)에 쌓는다.
 * 게임이 세 개뿐이라 테이블로 옮겨봐야 관리 화면만 늘어난다.
 * 여기 id는 그대로 balance_votes."gameId"로 들어간다 — 임의로 바꾸면 과거 표와 끊긴다.
 */
const BALANCE_GAMES = [
  {
    id: 1,
    question: 'Q. 금요일 퇴근 10분 전, "이거 월요일 오전에 보고해야 하니까 지금 좀 부탁해~" 라며 일을 던지고 먼저 퇴근하는 상사, 어떻게 할까요?',
    desc: '직장인들의 퇴근 시간을 위협하는 상황, 당신의 선택은?',
    optA: '뚝배기 🔨',
    optB: '그럴 수 있지~'
  },
  {
    id: 2,
    question: 'Q. 주말에 팀장님이 개인 톡으로 가벼운 업무 지시를 내린다면?',
    desc: '주말 휴식을 깨는 상사의 카톡, 어떻게 대처하시겠습니까?',
    optA: '일단 읽씹 📱',
    optB: '바로 답장 🏃'
  },
  {
    id: 3,
    question: 'Q. 애인이 절친한 이성 친구와 단둘이 당일치기 여행을 간다고 한다면?',
    desc: '연인 사이의 이성 친구 문제, 어디까지 허용 가능할까요?',
    optA: '절대 안 돼 🙅',
    optB: '쿨하게 허락 🤷'
  }
];

type GameTally = {
  votesA: number;
  votesB: number;
  /** 내가 고른 쪽. null이면 아직 안 골랐다 */
  myOption: 'A' | 'B' | null;
  /** 이미 한 번 바꿨는가. 사연 투표와 같이 변경은 1회뿐이다 */
  changed: boolean;
};

const EMPTY_TALLY: GameTally = { votesA: 0, votesB: 0, myOption: null, changed: false };

interface BalanceGameSectionProps {
  /**
   * 비로그인 상태로 투표를 누르면 호출된다. 앱이 쓰는 로그인 유도 모달을 띄우기 위한 것.
   * 넘겨주지 않으면 이 컴포넌트가 자체 모달을 띄운다 — 어느 쪽이든 버튼이 죽지는 않는다.
   */
  onRequireLogin: (message: string) => void;
}

export const BalanceGameSection: React.FC<BalanceGameSectionProps> = ({ onRequireLogin }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tallies, setTallies] = useState<Record<number, GameTally>>({});

  /**
   * 로그인 여부는 앱 상태(isGuest)가 아니라 세션에서 직접 본다.
   * 서버가 auth.uid()로 판정하므로, 화면도 같은 근거를 봐야 어긋나지 않는다.
   */
  const [userId, setUserId] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 집계를 못 읽었을 때 참이 된다.
   * 이때 0표로 그리면 "아직 아무도 안 골랐어요"라는 거짓말을 하게 되므로,
   * 게이지 자리에 못 읽었다는 사실과 다시 시도할 방법을 대신 놓는다.
   */
  const [loadFailed, setLoadFailed] = useState(false);

  const [isHovered, setIsHovered] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const notify = useCallback((text: string) => {
    setMessage(text);
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    messageTimerRef.current = setTimeout(() => setMessage(null), 3000);
  }, []);

  useEffect(() => () => {
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
  }, []);

  // 서버가 돌려준 집계를 화면 상태로 옮긴다. 표가 하나도 없는 게임은 응답에 아예 없다
  const applyState = useCallback((raw: unknown) => {
    const rows = (raw ?? {}) as Record<string, Partial<GameTally> | undefined>;
    setLoadFailed(false);
    setTallies(() => {
      const next: Record<number, GameTally> = {};
      for (const game of BALANCE_GAMES) {
        const row = rows[String(game.id)];
        next[game.id] = row
          ? {
              votesA: row.votesA ?? 0,
              votesB: row.votesB ?? 0,
              myOption: row.myOption ?? null,
              changed: row.changed ?? false,
            }
          : EMPTY_TALLY;
      }
      return next;
    });
  }, []);

  const loadState = useCallback(async () => {
    const { data, error } = await supabase.rpc('balance_game_state');
    if (error) {
      // 실패를 삼키면 화면은 '0표'로 남는다. 모른다는 걸 모른다고 말한다
      setLoadFailed(true);
      return;
    }
    applyState(data);
  }, [applyState]);

  useEffect(() => {
    let alive = true;

    /*
      세션이 확정된 다음에 집계를 읽는다. 먼저 읽으면 서버가 auth.uid()를
      못 봐서 '내가 고른 쪽'이 비어 오고, 이미 투표한 사람에게 투표 전 화면이
      보인다. 이 한 번이 마운트당 유일한 balance_game_state 호출이다.
    */
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setUserId(data.session?.user?.id ?? null);
      void loadState();
    });

    // 계정이 바뀌면 '내가 고른 쪽'도 달라지므로 집계를 다시 읽는다.
    // INITIAL_SESSION은 위 getSession()과 같은 시점이라 여기서 받으면 중복 호출이 된다
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      setUserId(session?.user?.id ?? null);
      void loadState();
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [loadState]);

  // 자동 롤링 타이머
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

  const handleVote = async (gameId: number, option: 'A' | 'B') => {
    // 사연 투표와 같은 규칙: userId 없이는 표를 받을 수 없다
    if (!userId) {
      onRequireLogin('밸런스 게임에 투표하려면 로그인이 필요해요.');
      return;
    }

    const before = tallies[gameId] ?? EMPTY_TALLY;
    if (before.myOption === option) return; // 같은 쪽을 다시 누른 경우
    if (before.myOption && before.changed) {
      notify('투표는 최대 1번만 변경할 수 있습니다.');
      return;
    }

    /*
      화면을 먼저 바꾸고 서버로 보낸다.
      예전에는 누른 뒤 10초가 지나야 표가 움직였는데, 그 사이에는 눌렸는지
      아닌지 알 수가 없어서 한 번 더 누르게 된다. 저장이 실제로 일어나는
      지금은 미룰 이유가 없다 — 거절당하면 서버 기준으로 되돌린다.
    */
    setTallies(prev => ({
      ...prev,
      [gameId]: {
        votesA: before.votesA + (option === 'A' ? 1 : 0) - (before.myOption === 'A' ? 1 : 0),
        votesB: before.votesB + (option === 'B' ? 1 : 0) - (before.myOption === 'B' ? 1 : 0),
        myOption: option,
        changed: before.changed || before.myOption !== null,
      },
    }));

    if (before.myOption) {
      notify('투표를 변경했습니다. 변경은 한 번뿐이라 이제 확정됩니다.');
    }

    const { data, error } = await supabase.rpc('vote_balance_game', {
      p_game_id: gameId,
      p_option: option,
    });

    if (error) {
      notify(error.message || '투표를 처리하지 못했습니다.');
      setTallies(prev => ({ ...prev, [gameId]: before }));
      void loadState();
      return;
    }

    applyState(data);
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
        {BALANCE_GAMES.map((game) => {
          const tally = tallies[game.id] ?? EMPTY_TALLY;

          return (
            <div key={game.id} className="w-full flex flex-col md:flex-row gap-4 md:gap-6 items-center px-6 py-2 md:px-8 shrink-0" style={{ width: `${100 / BALANCE_GAMES.length}%` }}>
              <div className="flex-1 z-10 w-full">
                <h3 className="font-headline-lg text-base sm:text-lg font-bold text-white leading-snug">
                  {game.question}
                </h3>
              </div>

              {/* 결과 비율 바 + 투표 버튼 (사연 피드 카드와 동일한 규칙) */}
              <div className="w-full md:w-72 z-10 font-mono">
                {loadFailed ? (
                  /* 못 읽은 걸 0표로 그리면 "아직 아무도 안 골랐어요"라는 거짓말이 된다 */
                  <div className="mb-3 py-2 text-center">
                    <p className="text-[11px] text-white/60">지금은 결과를 불러올 수 없어요</p>
                    <button
                      onClick={() => void loadState()}
                      className="mt-1 text-[11px] font-bold text-white underline underline-offset-2 cursor-pointer"
                    >
                      다시 불러오기
                    </button>
                  </div>
                ) : (
                  /* 게이지 규칙(봉인·소수표·퍼센트)은 VoteResult 한 곳에만 있다.
                     밸런스 게임엔 작성자가 없으므로 isMyStory는 넘기지 않는다 */
                  <VoteResult
                    votesA={tally.votesA}
                    votesB={tally.votesB}
                    hasVoted={tally.myOption !== null}
                    labels={{ a: game.optA, b: game.optB }}
                    surface="onyx"
                  />
                )}

                {/* 버튼 순서는 게이지와 같다 — 왼쪽이 optB(인디고), 오른쪽이 optA(코랄).
                    사연 카드도 왼쪽 니 편(B) 오른쪽 내 편(A)이라 규칙이 하나로 맞는다 */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleVote(game.id, 'B')}
                    aria-pressed={tally.myOption === 'B'}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      tally.myOption === 'B'
                        ? 'bg-[var(--color-your-side)] text-white'
                        : 'bg-white/10 text-white hover:bg-[#6C7BE8]/20'
                    }`}
                  >
                    {game.optB}
                  </button>
                  <button
                    onClick={() => handleVote(game.id, 'A')}
                    aria-pressed={tally.myOption === 'A'}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      tally.myOption === 'A'
                        ? 'bg-[var(--color-my-side)] text-[#1C1C1C]'
                        : 'bg-white/10 text-white hover:bg-[#FF6B5A]/20'
                    }`}
                  >
                    {game.optA}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 서버가 표를 거절했을 때만 뜬다. 배너 안에서 알려야 어떤 게임 얘기인지 안다 */}
      {message && (
        <div className="absolute bottom-11 left-0 right-0 flex justify-center z-20 px-6">
          <p className="text-[11px] text-white bg-white/15 rounded-full px-3 py-1 text-center" role="status">
            {message}
          </p>
        </div>
      )}

      {/* Indicator dots at the bottom center */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
        <div className="flex items-center gap-1.5">
          {BALANCE_GAMES.map((game, idx) => (
            <button
              key={game.id}
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
