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
    <div className="bg-[#151515] text-white p-4 sm:p-5 mb-6 border-4 border-black elevated-tile relative">
      <div className="flex items-center justify-between mb-3 border-b-2 border-white/20 pb-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 bg-[#e21500] text-white text-xs font-mono font-black border border-white uppercase tracking-wider">
            DAILY BALANCE GAME
          </span>
        </div>
        <span className="text-xs text-white/80 font-mono font-bold">{total.toLocaleString()} VOTES</span>
      </div>

      <h3 className="text-sm sm:text-base font-black text-white mb-4 leading-snug tracking-tight">
        Q. 현실에서 더 피꺼솥(피가 역류)나는 직장 진상 타입은?
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {/* Option A */}
        <button
          onClick={() => handleVote('A')}
          disabled={selectedOption !== null}
          className={`relative p-3.5 border-2 text-left transition-all cursor-pointer ${
            selectedOption === 'A'
              ? 'bg-[#e21500] border-white text-white font-black shadow-[4px_4px_0px_#fff]'
              : 'bg-white text-black border-black hover:border-[#e21500]'
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-mono font-black px-2 py-0.5 bg-black text-white border border-black uppercase">A. 내편</span>
            {selectedOption === 'A' && <CheckCircle2 className="w-4 h-4 text-white" />}
          </div>
          <p className="text-xs font-bold leading-relaxed">
            퇴근 5분 전에 "이거 오늘까지 정리해" 던지고 튀는 부장님
          </p>

          {selectedOption && (
            <div className="mt-2.5 pt-2 border-t border-black/20 flex justify-between items-center text-xs font-black font-mono">
              <span>지지율</span>
              <span className="text-base">{percentA}%</span>
            </div>
          )}
        </button>

        {/* Option B */}
        <button
          onClick={() => handleVote('B')}
          disabled={selectedOption !== null}
          className={`relative p-3.5 border-2 text-left transition-all cursor-pointer ${
            selectedOption === 'B'
              ? 'bg-[#fffa82] border-black text-black font-black shadow-[4px_4px_0px_#000]'
              : 'bg-white text-black border-black hover:border-[#fffa82]'
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-mono font-black px-2 py-0.5 bg-black text-white border border-black uppercase">B. 상대편</span>
            {selectedOption === 'B' && <CheckCircle2 className="w-4 h-4 text-black" />}
          </div>
          <p className="text-xs font-bold leading-relaxed">
            자기가 한 척 숟가락 얹고 칭찬만 쏙 빼먹는 동기
          </p>

          {selectedOption && (
            <div className="mt-2.5 pt-2 border-t border-black/20 flex justify-between items-center text-xs font-black font-mono">
              <span>지지율</span>
              <span className="text-base">{percentB}%</span>
            </div>
          )}
        </button>
      </div>

      {selectedOption && (
        <div className="text-center text-xs text-[#fffa82] font-mono font-black mt-2 uppercase tracking-widest flex items-center justify-center gap-1">
          <span className="material-symbols-outlined text-[16px]">verified</span> VOTED! {percentA > percentB ? 'A안 피꺼솥 승리!' : 'B안 격분 승리!'}
        </div>
      )}
    </div>
  );
};

