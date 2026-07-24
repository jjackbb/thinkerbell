import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Sparkles, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onComplete: (nickname: string, provider: 'kakao' | 'apple' | 'google') => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onComplete,
}) => {
  if (!isOpen) return null;

  const [provider, setProvider] = useState<'kakao' | 'apple' | 'google'>('kakao');
  const [nickname, setNickname] = useState('속뚫리는고구마');
  const [isLoadingNickname, setIsLoadingNickname] = useState(false);

  const fetchRandomNickname = async () => {
    setIsLoadingNickname(true);
    try {
      const res = await fetch('/api/nickname/random');
      if (res.ok) {
        const data = await res.json();
        setNickname(data.nickname);
      }
    } catch (err) {
      // fallback
      setNickname('사이다마신곰99');
    } finally {
      setIsLoadingNickname(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    onComplete(nickname.trim(), provider);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#fffaf0] border border-[#e8e2d0] rounded-3xl w-full max-w-md shadow-2xl p-6 sm:p-8 space-y-6 text-center">
        
        {/* Header Branding */}
        <div className="space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-2xl mx-auto shadow-lg transform -rotate-3">
            <span className="text-[#ff4d8b]">니</span>편
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0a0a0a] font-display">
            니편내편에 오신 것을 환영합니다!
          </h2>
          <p className="text-xs sm:text-sm text-[#6a6a6a]">
            현실 부담 0%! 완전한 익명성으로 감정을 마음껏 분출하세요.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          
          {/* Social Provider Choice */}
          <div>
            <label className="block text-xs font-bold text-[#0a0a0a] mb-2">
              1초 간편 인증 선택
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setProvider('kakao')}
                className={`py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                  provider === 'kakao'
                    ? 'bg-[#fee500] text-[#0a0a0a] border-[#fee500] shadow-sm font-extrabold ring-2 ring-[#0a0a0a]'
                    : 'bg-[#f5f0e0] border-[#e8e2d0] text-[#6a6a6a]'
                }`}
              >
                카카오
              </button>
              <button
                type="button"
                onClick={() => setProvider('apple')}
                className={`py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                  provider === 'apple'
                    ? 'bg-[#0a0a0a] text-white border-[#0a0a0a] shadow-sm font-extrabold ring-2 ring-[#ff4d8b]'
                    : 'bg-[#f5f0e0] border-[#e8e2d0] text-[#6a6a6a]'
                }`}
              >
                Apple
              </button>
              <button
                type="button"
                onClick={() => setProvider('google')}
                className={`py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                  provider === 'google'
                    ? 'bg-white text-[#0a0a0a] border-gray-300 shadow-sm font-extrabold ring-2 ring-[#0a0a0a]'
                    : 'bg-[#f5f0e0] border-[#e8e2d0] text-[#6a6a6a]'
                }`}
              >
                Google
              </button>
            </div>
          </div>

          {/* Random Anonymous Nickname */}
          <div>
            <label className="block text-xs font-bold text-[#0a0a0a] mb-1.5">
              100% 익명 닉네임 설정
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={12}
                className="flex-1 p-3 text-xs sm:text-sm bg-[#faf5e8] border border-[#e8e2d0] rounded-2xl font-bold text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff4d8b]"
              />
              <button
                type="button"
                onClick={fetchRandomNickname}
                disabled={isLoadingNickname}
                className="px-3.5 bg-[#b8a4ed] hover:bg-[#a591e0] text-[#0a0a0a] font-bold rounded-2xl text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                title="랜덤 닉네임 추천"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingNickname ? 'animate-spin' : ''}`} />
                <span>추천</span>
              </button>
            </div>
            <p className="text-[11px] text-[#6a6a6a] mt-1.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#ff4d8b]" /> 개인정보는 전혀 노출되지 않으며 닉네임은 언제든 변경 가능합니다.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#0a0a0a] hover:bg-[#1f1f1f] text-white font-extrabold text-sm rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>니편내편 시작하기</span>
            <CheckCircle2 className="w-4 h-4 text-[#ff4d8b]" />
          </button>
        </form>
      </div>
    </div>
  );
};
