import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export const BalanceGameSection: React.FC = () => {
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | null>(null);
  const [votes, setVotes] = useState({ A: 782, B: 218 });

  const handleVote = (option: 'A' | 'B') => {
    if (selectedOption) return;
    setSelectedOption(option);
    setVotes(prev => ({
      ...prev,
      [option]: prev[option] + 1
    }));
  };

  const total = votes.A + votes.B;
  const percentA = Math.round((votes.A / total) * 100);
  const percentB = 100 - percentA;

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-[#3ECF8E] animate-pulse"></span>
        <h2 className="font-label-md text-xs uppercase tracking-widest text-[#5f5e5e] font-mono">Current Hot Logic</h2>
      </div>

      <div className="relative overflow-hidden bg-[#1C1C1C] rounded-lg p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center border border-[#1C1C1C]">
        <div className="flex-1 z-10">
          <div className="inline-block px-3 py-1 bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 rounded text-[#3ECF8E] font-mono text-xs mb-4">
            TRENDING BALANCE GAME
          </div>
          <h3 className="font-headline-lg text-lg sm:text-xl font-bold text-white mb-3 leading-snug">
            Q. 점심시간에 고객 전화 자꾸 받는 신입, 가르쳐야 할까요?
          </h3>
          <p className="text-[#5f5e5e] font-body-sm text-xs sm:text-sm mb-6 max-w-xl">
            휴게시간을 지켜야 한다는 의견과 팀 분위기 및 책임감의 문제라는 논쟁이 첨예합니다.
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
              <span>A. 가르쳐야 한다</span>
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
              <span>B. 본인 마음이다</span>
              {selectedOption === 'B' && <CheckCircle2 className="w-4 h-4 text-[#1C1C1C]" />}
            </button>
          </div>
        </div>

        {/* Real-time stats gauge */}
        <div className="w-full md:w-72 flex flex-col gap-3 z-10 font-mono">
          <div className="bg-white/5 p-4 border border-white/10 rounded-lg">
            <div className="flex justify-between text-white text-xs mb-1.5 font-bold">
              <span>가르쳐야 한다</span>
              <span className="text-[#3ECF8E]">{percentA}%</span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div className="bg-[#3ECF8E] h-full vote-bar-progress" style={{ width: `${percentA}%` }}></div>
            </div>
          </div>

          <div className="bg-white/5 p-4 border border-white/10 rounded-lg opacity-80">
            <div className="flex justify-between text-white text-xs mb-1.5 font-bold">
              <span>본인 마음이다</span>
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


