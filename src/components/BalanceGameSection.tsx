import React, { useState } from 'react';
import { Scale, CheckCircle2, Sparkles } from 'lucide-react';

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
    <div className="bg-[#1a3a3a] text-white rounded-2xl p-4 sm:p-5 mb-6 shadow-md relative overflow-hidden">
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#ff4d8b]/20 rounded-full blur-xl pointer-events-none"></div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#ff4d8b] text-white text-xs font-bold flex items-center gap-1">
            <Scale className="w-3.5 h-3.5" /> 오늘의 밸런스 게임
          </span>
          <span className="text-xs text-[#a4d4c5] font-medium hidden sm:inline">1초 만에 여론 결정!</span>
        </div>
        <span className="text-xs text-gray-300 font-mono">{total.toLocaleString()}명 참여 중</span>
      </div>

      <h3 className="text-sm sm:text-base font-extrabold text-white mb-4 leading-snug">
        Q. 현실에서 더 피꺼솥(피가 역류)나는 직장 진상 타입은?
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {/* Option A */}
        <button
          onClick={() => handleVote('A')}
          disabled={selectedOption !== null}
          className={`relative p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedOption === 'A'
              ? 'bg-[#ff4d8b] border-[#ff4d8b] text-white shadow-lg font-bold scale-[1.01]'
              : 'bg-[#2a4a4a] border-[#3a5a5a] text-white hover:border-[#ff4d8b]'
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-black px-2 py-0.5 bg-black/30 rounded-md">A안 (내편)</span>
            {selectedOption === 'A' && <CheckCircle2 className="w-4 h-4 text-white" />}
          </div>
          <p className="text-xs font-semibold leading-relaxed">
            퇴근 5분 전에 "이거 오늘까지 정리해" 던지고 튀는 부장님
          </p>

          {selectedOption && (
            <div className="mt-2.5 pt-2 border-t border-white/20 flex justify-between items-center text-xs font-bold">
              <span>지지율</span>
              <span className="text-base">{percentA}%</span>
            </div>
          )}
        </button>

        {/* Option B */}
        <button
          onClick={() => handleVote('B')}
          disabled={selectedOption !== null}
          className={`relative p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedOption === 'B'
              ? 'bg-[#b8a4ed] border-[#b8a4ed] text-[#0a0a0a] shadow-lg font-bold scale-[1.01]'
              : 'bg-[#2a4a4a] border-[#3a5a5a] text-white hover:border-[#b8a4ed]'
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-black px-2 py-0.5 bg-black/30 text-white rounded-md">B안 (상대편)</span>
            {selectedOption === 'B' && <CheckCircle2 className="w-4 h-4 text-[#0a0a0a]" />}
          </div>
          <p className="text-xs font-semibold leading-relaxed">
            자기가 한 척 숟가락 얹고 칭찬만 쏙 빼먹는 동기
          </p>

          {selectedOption && (
            <div className="mt-2.5 pt-2 border-t border-black/20 flex justify-between items-center text-xs font-bold">
              <span>지지율</span>
              <span className="text-base">{percentB}%</span>
            </div>
          )}
        </button>
      </div>

      {selectedOption && (
        <div className="text-center text-xs text-[#a4d4c5] font-semibold mt-1 flex items-center justify-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-[#ff4d8b]" /> 투표 완료! {percentA > percentB ? 'A안이 유력한 피꺼솥 승리!' : 'B안이 압도적 격분 승리!'}
        </div>
      )}
    </div>
  );
};
