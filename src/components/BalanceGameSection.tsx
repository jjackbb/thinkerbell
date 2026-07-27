import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

export const BalanceGameSection: React.FC = () => {
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | null>(null);
  const [votes, setVotes] = useState({ A: 782, B: 218 });
  const confirmedOptionRef = useRef<'A' | 'B' | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleVote = (option: 'A' | 'B') => {
    if (selectedOption === option) return;
    
    setSelectedOption(option);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setVotes(prev => {
        const newVotes = { ...prev };
        
        // 이전 투표가 있었다면 취소
        const prevConfirmed = confirmedOptionRef.current;
        if (prevConfirmed && prevConfirmed !== option) {
          newVotes[prevConfirmed] -= 1;
        }
        
        // 새로운 투표가 이전 확정된 투표와 다를 때만 증가
        if (prevConfirmed !== option) {
          newVotes[option] += 1;
        }
        
        confirmedOptionRef.current = option;
        return newVotes;
      });
    }, 10000);
  };

  const total = votes.A + votes.B;
  const percentA = Math.round((votes.A / total) * 100);
  const percentB = 100 - percentA;

  return (
    <section className="mb-10">


      <div className="relative overflow-hidden bg-[#1C1C1C] rounded-lg p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center border border-[#1C1C1C]">
        <div className="flex-1 z-10">
          <div className="inline-block px-3 py-1 bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 rounded text-[#3ECF8E] font-mono text-xs mb-4">
            오늘의 밸런스 게임
          </div>
          <h3 className="font-headline-lg text-lg sm:text-xl font-bold text-white mb-3 leading-snug">
            Q. 금요일 퇴근 10분 전, "이거 월요일 오전에 보고해야 하니까 지금 좀 부탁해~" 라며 일을 던지고 먼저 퇴근하는 상사, 어떻게 할까요?
          </h3>
          <p className="text-[#5f5e5e] font-body-sm text-xs sm:text-sm mb-6 max-w-xl">
            직장인들의 퇴근 시간을 위협하는 상황, 당신의 선택은?
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleVote('A')}
              className={`px-5 py-2.5 rounded-lg font-mono text-xs font-bold flex items-center gap-2 transition-transform active:scale-95 cursor-pointer ${
                selectedOption === 'A'
                  ? 'bg-[#3ECF8E] text-[#1C1C1C]'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <span>A. 뚝배기 🔨</span>
              {selectedOption === 'A' && <CheckCircle2 className="w-4 h-4 text-[#1C1C1C]" />}
            </button>

            <button
              onClick={() => handleVote('B')}
              className={`px-5 py-2.5 rounded-lg font-mono text-xs font-bold flex items-center gap-2 transition-transform active:scale-95 cursor-pointer ${
                selectedOption === 'B'
                  ? 'bg-[#3ECF8E] text-[#1C1C1C]'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <span>B. 그럴 수 있지~</span>
              {selectedOption === 'B' && <CheckCircle2 className="w-4 h-4 text-[#1C1C1C]" />}
            </button>
          </div>
        </div>

        {/* Real-time stats gauge */}
        <div className="w-full md:w-72 flex flex-col gap-3 z-10 font-mono">
          <div className="bg-white/5 p-4 border border-white/10 rounded-lg">
            <div className="flex justify-between text-white text-xs mb-1.5 font-bold">
              <span>뚝배기 🔨</span>
              <span className="text-[#3ECF8E]">{percentA}%</span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div className="bg-[#3ECF8E] h-full vote-bar-progress" style={{ width: `${percentA}%` }}></div>
            </div>
          </div>

          <div className="bg-white/5 p-4 border border-white/10 rounded-lg opacity-80">
            <div className="flex justify-between text-white text-xs mb-1.5 font-bold">
              <span>그럴 수 있지~</span>
              <span>{percentB}%</span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div className="bg-white/40 h-full vote-bar-progress" style={{ width: `${percentB}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


