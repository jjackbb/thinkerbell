import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WelcomeModalProps {
  isOpen: boolean;
  onComplete: (nickname: string, provider: 'kakao' | 'apple' | 'google') => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onComplete }) => {
  if (!isOpen) return null;

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getKoreanErrorMessage = (error: any) => {
    const msg = error?.message || '';
    const code = error?.code || '';
    console.error('Supabase Auth Error Detail:', error);

    if (code === 'user_already_exists' || msg.includes('User already registered') || msg.includes('already exists')) {
      return '이미 가입된 이메일입니다.';
    }
    if (msg.includes('Password should be at least 6 characters')) {
      return '비밀번호는 최소 6자 이상이어야 합니다.';
    }
    if (msg.includes('Unable to validate email address') || msg.includes('invalid format')) {
      return '이메일 형식이 올바르지 않습니다.';
    }
    if (code === 'invalid_credentials' || msg.includes('Invalid login credentials')) {
      return '이메일 또는 비밀번호가 일치하지 않습니다.';
    }
    if (msg.includes('Signups not allowed') || msg.includes('Signup is disabled')) {
      return '현재 회원가입이 비활성화되어 있습니다. Supabase 대시보드를 확인해주세요.';
    }
    return `오류: ${msg || '다시 시도해주세요.'}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      if (isLoginMode) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
      } else {
        if (!nickname.trim()) {
          throw new Error('닉네임을 입력해주세요.');
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nickname: nickname.trim()
            }
          }
        });
        if (error) throw error;
      }
    } catch (error: any) {
      if (error.message === '닉네임을 입력해주세요.') {
        setErrorMsg(error.message);
      } else {
        setErrorMsg(getKoreanErrorMessage(error));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#fffaf0] border border-[#e8e2d0] rounded-3xl w-full max-w-md shadow-2xl p-6 sm:p-8 space-y-6 text-center relative">
        
        {/* Header Branding */}
        <div className="space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-2xl mx-auto shadow-lg transform -rotate-3">
            <span className="text-[#ff4d8b]">니</span>편
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0a0a0a] font-display">
            니편내편에 오신 것을 환영합니다!
          </h2>
          <p className="text-xs sm:text-sm text-[#6a6a6a]">
            {isLoginMode ? '로그인하고 감정을 마음껏 분출하세요.' : '가입하고 완전한 익명성으로 활동하세요.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          
          <div>
            <label className="block text-xs font-bold text-[#0a0a0a] mb-1.5">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 text-xs sm:text-sm bg-[#faf5e8] border border-[#e8e2d0] rounded-2xl font-bold text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff4d8b]"
              placeholder="example@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0a0a0a] mb-1.5">비밀번호 (6자 이상)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 text-xs sm:text-sm bg-[#faf5e8] border border-[#e8e2d0] rounded-2xl font-bold text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff4d8b]"
              placeholder="••••••••"
              required
            />
          </div>

          {!isLoginMode && (
            <div>
              <label className="block text-xs font-bold text-[#0a0a0a] mb-1.5">닉네임</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={12}
                className="w-full p-3 text-xs sm:text-sm bg-[#faf5e8] border border-[#e8e2d0] rounded-2xl font-bold text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#ff4d8b]"
                placeholder="익명 닉네임"
                required={!isLoginMode}
              />
              <p className="text-[11px] text-[#6a6a6a] mt-1.5 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#ff4d8b]" /> 언제든 변경 가능합니다.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-[#0a0a0a] hover:bg-[#1f1f1f] text-white font-extrabold text-sm rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{isLoginMode ? '로그인하기' : '니편내편 시작하기'}</span>
            {!isLoading && <CheckCircle2 className="w-4 h-4 text-[#ff4d8b]" />}
          </button>
        </form>

        <div className="pt-2 border-t border-[#e8e2d0] text-xs font-bold text-[#6a6a6a]">
          {isLoginMode ? "아직 계정이 없으신가요? " : "이미 계정이 있으신가요? "}
          <button 
            type="button" 
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setErrorMsg('');
            }} 
            className="text-[#ff4d8b] hover:underline cursor-pointer"
          >
            {isLoginMode ? '회원가입' : '로그인'}
          </button>
        </div>
      </div>
    </div>
  );
};
