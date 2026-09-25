import React, { useState } from 'react';
import { ShieldCheck, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WelcomeModalProps {
  isOpen: boolean;
  onComplete: (nickname: string, provider: 'kakao' | 'apple' | 'google') => void;
  onGuestBrowse: () => void;
  signupLinkExpired?: boolean;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onComplete, onGuestBrowse, signupLinkExpired = false }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [showExpiredLink, setShowExpiredLink] = useState(signupLinkExpired);

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
    if (code === 'email_not_confirmed' || msg.includes('Email not confirmed')) {
      return '이메일의 가입 확인 링크를 먼저 열어주세요.';
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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nickname: nickname.trim()
            }
          }
        });
        if (error) throw error;
        if (!data.session) {
          setConfirmationEmail(email.trim());
          setPassword('');
        }
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

  const handleResend = async (address: string) => {
    setErrorMsg('');
    setResendMessage('');
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: address });
      if (error) throw error;
      setConfirmationEmail(address);
      setShowExpiredLink(false);
      setResendMessage('확인 메일을 다시 요청했습니다. 메일함과 스팸함을 확인해 주세요.');
    } catch (error) {
      setErrorMsg(getKoreanErrorMessage(error));
    } finally {
      setIsResending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[white] border border-[#E5E7EB] rounded-3xl w-full max-w-md shadow-2xl p-6 sm:p-8 space-y-6 text-center relative">
        
        {/* Header Branding */}
        <div className="space-y-2">
          <div className="text-center mb-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[#FF6B5A] text-5xl font-bold">terminal</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#1C1C1C] font-display">
            니편내편에 오신 것을 환영합니다!
          </h2>
          <p className="text-xs sm:text-sm text-[#5f5e5e]">
            {showExpiredLink
              ? '가입 확인 링크를 사용할 수 없습니다.'
              : confirmationEmail
              ? '메일함에서 가입 확인 링크를 열어주세요.'
              : isLoginMode ? '로그인하고 감정을 마음껏 분출하세요.' : '가입하고 완전한 익명성으로 활동하세요.'}
          </p>
        </div>

        {/* Form */}
        {showExpiredLink ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleResend(email.trim());
            }}
            className="space-y-4 text-left"
          >
            <p className="text-sm text-[#1C1C1C]">링크가 만료됐거나 이미 사용됐을 수 있습니다. 가입할 때 입력한 이메일로 확인 메일을 다시 요청해 주세요.</p>
            <label htmlFor="expired-signup-email" className="block text-xs font-bold text-[#1C1C1C]">가입 이메일</label>
            <input
              id="expired-signup-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full p-3 text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-2xl text-[#1C1C1C]"
              placeholder="example@email.com"
              required
            />
            {errorMsg && <p className="text-xs text-red-600" role="alert">{errorMsg}</p>}
            <button type="submit" disabled={isResending} className="w-full py-3.5 bg-[#1C1C1C] text-white font-extrabold text-sm rounded-2xl disabled:opacity-50">
              {isResending ? '요청 중…' : '확인 메일 다시 요청하기'}
            </button>
          </form>
        ) : confirmationEmail ? (
          <div className="space-y-4 text-left" role="status" aria-live="polite">
            <p className="text-sm text-[#1C1C1C]">
              <strong>{confirmationEmail}</strong>로 확인 메일을 요청했습니다. 메일이 보이지 않으면 스팸함을 확인하고, 링크가 만료됐다면 다시 요청해 주세요.
            </p>
            {resendMessage && <p className="text-xs text-[#1C1C1C]">{resendMessage}</p>}
            {errorMsg && <p className="text-xs text-red-600" role="alert">{errorMsg}</p>}
            <button
              type="button"
              onClick={() => void handleResend(confirmationEmail)}
              disabled={isResending}
              className="w-full py-3.5 bg-[#1C1C1C] text-white font-extrabold text-sm rounded-2xl disabled:opacity-50"
            >
              {isResending ? '요청 중…' : '확인 메일 다시 요청하기'}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmationEmail(null);
                setEmail('');
                setErrorMsg('');
                setResendMessage('');
                setIsLoginMode(false);
              }}
              className="w-full text-xs font-bold text-[#5f5e5e] hover:underline"
            >
              다른 이메일로 가입하기
            </button>
          </div>
        ) : <form onSubmit={handleSubmit} className="space-y-4 text-left">
          
          <div>
            <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-2xl font-bold text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#FF6B5A]"
              placeholder="example@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">비밀번호 (6자 이상)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-2xl font-bold text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#FF6B5A]"
              placeholder="••••••••"
              required
            />
          </div>

          {!isLoginMode && (
            <div>
              <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">닉네임</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={12}
                className="w-full p-3 text-xs sm:text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-2xl font-bold text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#FF6B5A]"
                placeholder="익명 닉네임"
                required={!isLoginMode}
              />
              <p className="text-[11px] text-[#5f5e5e] mt-1.5 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#FF6B5A]" /> 언제든 변경 가능합니다.
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
            className="w-full py-3.5 bg-[#1C1C1C] hover:bg-[#333333] text-white font-extrabold text-sm rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{isLoginMode ? '로그인하기' : '니편내편 시작하기'}</span>
            {!isLoading && <Check className="w-4 h-4 text-[#FF6B5A]" />}
          </button>
        </form>}

        <button
          type="button"
          onClick={() => {
            setShowExpiredLink(false);
            onGuestBrowse();
          }}
          className="w-full py-3 bg-white border border-[#E5E7EB] text-[#5f5e5e] font-bold text-sm rounded-2xl hover:bg-[#f3f4f5] active:scale-95 transition-all cursor-pointer"
        >
          로그인 없이 둘러보기
        </button>

        <div className="pt-2 border-t border-[#E5E7EB] text-xs font-bold text-[#5f5e5e]">
          {confirmationEmail || showExpiredLink ? '이미 확인하셨나요? ' : isLoginMode ? "아직 계정이 없으신가요? " : "이미 계정이 있으신가요? "}
          <button 
            type="button" 
            onClick={() => {
              setIsLoginMode(confirmationEmail || showExpiredLink ? true : !isLoginMode);
              setConfirmationEmail(null);
              setShowExpiredLink(false);
              setResendMessage('');
              setErrorMsg('');
            }} 
            className="text-[#FF6B5A] hover:underline cursor-pointer"
          >
            {confirmationEmail || showExpiredLink ? '로그인' : isLoginMode ? '회원가입' : '로그인'}
          </button>
        </div>
      </div>
    </div>
  );
};
