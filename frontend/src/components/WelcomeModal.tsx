import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WelcomeModalProps {
  isOpen: boolean;
  onComplete: (nickname: string, provider: 'kakao' | 'apple' | 'google') => void;
  onGuestBrowse: () => void;
  signupLinkExpired?: boolean;
  emailCheckToken?: string | null;
  passwordRecoveryReturn?: boolean;
  passwordRecoveryReady?: boolean;
  recoveryLinkExpired?: boolean;
  onPasswordRecoveryComplete: () => void;
}

type EmailCheckPhase = 'entry' | 'sent' | 'verifying' | 'registered' | 'pending' | 'available' | 'failed';
type RecoveryPhase = 'idle' | 'request' | 'sent' | 'updating' | 'done';
const emailCheckEnabled = import.meta.env.VITE_EMAIL_CHECK_ENABLED === 'true';

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onComplete, onGuestBrowse, signupLinkExpired = false, emailCheckToken = null, passwordRecoveryReturn = false, passwordRecoveryReady = false, recoveryLinkExpired = false, onPasswordRecoveryComplete }) => {
  const [isLoginMode, setIsLoginMode] = useState(!(emailCheckEnabled && emailCheckToken));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [showExpiredLink, setShowExpiredLink] = useState(signupLinkExpired);
  const [emailCheckPhase, setEmailCheckPhase] = useState<EmailCheckPhase>(emailCheckToken ? 'verifying' : 'entry');
  const [emailCheckError, setEmailCheckError] = useState('');
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [signupToken, setSignupToken] = useState<string | null>(null);
  const [recoveryPhase, setRecoveryPhase] = useState<RecoveryPhase>(passwordRecoveryReturn ? (recoveryLinkExpired ? 'request' : 'updating') : 'idle');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryPasswordConfirm, setRecoveryPasswordConfirm] = useState('');
  const [recoveryError, setRecoveryError] = useState(recoveryLinkExpired ? '재설정 링크를 사용할 수 없습니다. 새 메일을 요청해 주세요.' : '');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const verificationStarted = useRef(false);

  // The dialog remains mounted while hidden. Drop credentials before another
  // account opens it on a shared browser.
  useEffect(() => {
    if (isOpen) return;
    setEmail('');
    setPassword('');
    setNickname('');
    setConfirmationEmail(null);
    setResendMessage('');
    setSignupToken(null);
    setRecoveryPassword('');
    setRecoveryPasswordConfirm('');
    setRecoveryError('');
    setErrorMsg('');
    setEmailCheckPhase('entry');
    setRecoveryPhase('idle');
  }, [isOpen]);

  useEffect(() => {
    if (passwordRecoveryReady) setRecoveryPhase('updating');
  }, [passwordRecoveryReady]);

  useEffect(() => {
    if (!emailCheckEnabled || !emailCheckToken || verificationStarted.current) return;
    verificationStarted.current = true;
    void (async () => {
      try {
        const response = await fetch('/api/auth/email-check/verify', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: emailCheckToken }),
        });
        if (response.status === 410) throw new Error('EMAIL_CHECK_LINK_UNAVAILABLE');
        if (!response.ok) throw new Error('EMAIL_CHECK_UNAVAILABLE');
        const result = await response.json().catch(() => ({}));
        if (!['registered', 'pending', 'available'].includes(result.status) ||
            typeof result.email !== 'string' ||
            (result.status === 'available' && typeof result.signupToken !== 'string')) {
          throw new Error('EMAIL_CHECK_UNAVAILABLE');
        }
        setEmail(result.email);
        setSignupToken(result.status === 'available' ? result.signupToken : null);
        setEmailCheckPhase(result.status);
        setIsLoginMode(result.status === 'registered');
      } catch (error) {
        setEmailCheckPhase('failed');
        setEmailCheckError(error instanceof Error && error.message === 'EMAIL_CHECK_LINK_UNAVAILABLE'
          ? '확인 링크가 만료됐거나 이미 사용됐습니다. 이메일을 다시 확인해 주세요.'
          : '지금은 링크를 확인할 수 없습니다. 잠시 뒤 메일의 링크를 다시 열어 주세요.');
      }
    })();
  }, [emailCheckToken]);

  const handleEmailCheck = async (event: React.FormEvent) => {
    event.preventDefault();
    setEmailCheckLoading(true);
    setEmailCheckError('');
    setSignupToken(null);
    try {
      const response = await fetch('/api/auth/email-check/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!response.ok) {
        setEmailCheckError(response.status === 429
          ? '요청이 많아 잠시 뒤 다시 시도할 수 있습니다.'
          : '확인 메일을 요청하지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
        return;
      }
      setEmailCheckPhase('sent');
    } catch {
      setEmailCheckError('확인 메일을 요청하지 못했습니다. 연결을 확인해 주세요.');
    } finally {
      setEmailCheckLoading(false);
    }
  };

  const handleRecoveryRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setRecoveryError('');
    setRecoveryLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/?auth=recovery`,
      });
      if (error) throw error;
      setRecoveryPhase('sent');
    } catch {
      setRecoveryError('재설정 메일을 요청하지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleRecoveryUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordRecoveryReady) return;
    if (recoveryPassword.length < 6 || recoveryPassword !== recoveryPasswordConfirm) {
      setRecoveryError('새 비밀번호를 6자 이상 입력하고 확인란에도 똑같이 입력해 주세요.');
      return;
    }
    setRecoveryError('');
    setRecoveryLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: recoveryPassword });
      if (error) throw error;
      setRecoveryPassword('');
      setRecoveryPasswordConfirm('');
      setRecoveryPhase('done');
    } catch {
      setRecoveryError('비밀번호를 변경하지 못했습니다. 다시 시도하거나 새 재설정 메일을 요청해 주세요.');
    } finally {
      setRecoveryLoading(false);
    }
  };

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
        if (emailCheckEnabled && emailCheckPhase !== 'available') {
          throw new Error('이메일 소유 확인을 먼저 완료해 주세요.');
        }
        if (!nickname.trim()) {
          throw new Error('닉네임을 입력해주세요.');
        }
        if (emailCheckEnabled) {
          if (!signupToken) throw new Error('이메일 소유 확인을 먼저 완료해 주세요.');
          const response = await fetch('/api/auth/email-check/signup', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, nickname: nickname.trim(), signupToken }),
          });
          const result = await response.json().catch(() => ({}));
          if (response.status === 409 && ['registered', 'pending'].includes(result.status)) {
            setEmailCheckPhase(result.status);
            setIsLoginMode(result.status === 'registered');
            setSignupToken(null);
            setPassword('');
            return;
          }
          if (response.status === 410) {
            setEmailCheckPhase('failed');
            setSignupToken(null);
            setEmailCheckError('확인 시간이 지났습니다. 이메일 소유 확인을 다시 요청해 주세요.');
            return;
          }
          if (!response.ok || result.created !== true) {
            if (response.status === 400) throw new Error('가입 정보를 다시 확인해 주세요.');
            setSignupToken(null);
            setEmailCheckPhase('entry');
            setIsLoginMode(true);
            setErrorMsg('가입 결과를 확인할 수 없습니다. 먼저 로그인을 시도하거나 새 확인 링크를 요청해 주세요.');
            return;
          }
          setSignupToken(null);
          const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
          if (loginError) {
            setEmailCheckPhase('registered');
            setIsLoginMode(true);
            setErrorMsg('계정이 만들어졌지만 자동 로그인하지 못했습니다. 아래에서 로그인해 주세요.');
          }
          return;
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
      if (error.message === '닉네임을 입력해주세요.' ||
          error.message === '가입 정보를 다시 확인해 주세요.' ||
          error.message === '이메일 소유 확인을 먼저 완료해 주세요.') {
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
      setResendMessage(emailCheckEnabled && emailCheckPhase === 'pending'
        ? '가입 확인 메일 재요청을 접수했습니다. 받은편지함과 스팸함을 확인해 주세요.'
        : '요청을 접수했습니다. 새 가입 대상인 주소라면 받은편지함이나 스팸함에 확인 메일이 도착합니다.');
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
            {recoveryPhase !== 'idle'
              ? recoveryPhase === 'done' ? '새 비밀번호가 저장됐습니다.'
                : recoveryPhase === 'updating' ? '새 비밀번호를 설정해 주세요.'
                : '비밀번호 재설정 메일을 요청할 수 있습니다.'
              : showExpiredLink
              ? '가입 확인 링크를 사용할 수 없습니다.'
              : confirmationEmail
              ? '가입 요청 결과를 확인해 주세요.'
              : emailCheckEnabled && emailCheckPhase === 'verifying'
              ? '이메일 소유권을 확인하고 있습니다.'
              : emailCheckEnabled && emailCheckPhase === 'registered'
              ? '이미 가입한 이메일입니다. 로그인해 주세요.'
              : emailCheckEnabled && emailCheckPhase === 'pending'
              ? '가입 확인이 아직 끝나지 않았습니다.'
              : emailCheckEnabled && emailCheckPhase === 'available'
              ? '새 계정으로 가입할 수 있는 이메일입니다.'
              : isLoginMode ? '로그인하고 감정을 마음껏 분출하세요.' : '가입하고 완전한 익명성으로 활동하세요.'}
          </p>
        </div>

        {/* Form */}
        {recoveryPhase === 'request' ? (
          <form onSubmit={handleRecoveryRequest} className="space-y-4 text-left">
            <p className="text-sm text-[#1C1C1C]">계정이 있는 주소라면 비밀번호 재설정 메일이 도착합니다.</p>
            <label htmlFor="recovery-email" className="block text-xs font-bold text-[#1C1C1C]">이메일</label>
            <input id="recovery-email" type="email" value={email}
              onChange={(event) => setEmail(event.target.value)} required
              className="w-full p-3 text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-2xl text-[#1C1C1C]" />
            {recoveryError && <p role="alert" className="text-xs text-red-600">{recoveryError}</p>}
            <button data-button-id="welcome-modal-button-01" type="submit" disabled={recoveryLoading}
              className="w-full py-3.5 bg-[#1C1C1C] text-white font-extrabold text-sm rounded-2xl disabled:opacity-50">
              {recoveryLoading ? '요청 중…' : '재설정 메일 요청하기'}
            </button>
          </form>
        ) : recoveryPhase === 'sent' ? (
          <div className="space-y-4 text-left" role="status">
            <p className="text-sm text-[#1C1C1C]">계정이 있는 주소라면 재설정 링크가 도착합니다. 받은편지함과 스팸함을 확인해 주세요.</p>
            <button data-button-id="welcome-modal-button-02" type="button" onClick={() => setRecoveryPhase('request')}
              className="w-full text-xs font-bold text-[#5f5e5e] hover:underline">다른 이메일 사용하기</button>
          </div>
        ) : recoveryPhase === 'updating' ? (
          passwordRecoveryReady ? (
            <form onSubmit={handleRecoveryUpdate} className="space-y-4 text-left">
              <label htmlFor="recovery-new-password" className="block text-xs font-bold text-[#1C1C1C]">새 비밀번호 (6자 이상)</label>
              <input id="recovery-new-password" type="password" value={recoveryPassword}
                onChange={(event) => setRecoveryPassword(event.target.value)} minLength={6} required
                autoComplete="new-password"
                className="w-full p-3 text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-2xl text-[#1C1C1C]" />
              <label htmlFor="recovery-confirm-password" className="block text-xs font-bold text-[#1C1C1C]">새 비밀번호 확인</label>
              <input id="recovery-confirm-password" type="password" value={recoveryPasswordConfirm}
                onChange={(event) => setRecoveryPasswordConfirm(event.target.value)} minLength={6} required
                autoComplete="new-password"
                className="w-full p-3 text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-2xl text-[#1C1C1C]" />
              {recoveryError && <p role="alert" className="text-xs text-red-600">{recoveryError}</p>}
              <button data-button-id="welcome-modal-button-03" type="submit" disabled={recoveryLoading}
                className="w-full py-3.5 bg-[#1C1C1C] text-white font-extrabold text-sm rounded-2xl disabled:opacity-50">
                {recoveryLoading ? '저장 중…' : '새 비밀번호 저장하기'}
              </button>
            </form>
          ) : (
            <div className="space-y-4 text-left" role="status">
              <p className="text-sm text-[#1C1C1C]">재설정 링크를 확인하고 있습니다. 계속 진행되지 않으면 새 메일을 요청해 주세요.</p>
              <button data-button-id="welcome-modal-button-04" type="button" onClick={() => setRecoveryPhase('request')}
                className="w-full text-xs font-bold text-[#5f5e5e] hover:underline">새 재설정 메일 요청하기</button>
            </div>
          )
        ) : recoveryPhase === 'done' ? (
          <button data-button-id="welcome-modal-button-05" type="button" onClick={() => { setRecoveryPhase('idle'); onPasswordRecoveryComplete(); }}
            className="w-full py-3.5 bg-[#1C1C1C] text-white font-extrabold text-sm rounded-2xl">
            니편내편 계속 이용하기
          </button>
        ) : showExpiredLink ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleResend(email.trim());
            }}
            className="space-y-4 text-left"
          >
            <p className="text-sm text-[#1C1C1C]">링크가 만료됐거나 이미 사용됐을 수 있습니다. 새 가입 대상인 주소에만 확인 메일이 다시 도착할 수 있습니다. 이미 가입했다면 로그인해 주세요.</p>
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
            <button data-button-id="welcome-modal-button-06" type="submit" disabled={isResending} className="w-full py-3.5 bg-[#1C1C1C] text-white font-extrabold text-sm rounded-2xl disabled:opacity-50">
              {isResending ? '요청 중…' : '확인 메일 다시 요청하기'}
            </button>
          </form>
        ) : confirmationEmail ? (
          <div className="space-y-4 text-left" role="status" aria-live="polite">
            <p className="text-sm text-[#1C1C1C]">
              {emailCheckEnabled && emailCheckPhase === 'pending' ? (
                <><strong>{confirmationEmail}</strong>의 가입 확인 메일 재요청을 접수했습니다. 받은편지함과 스팸함을 확인해 주세요.</>
              ) : (
                <><strong>{confirmationEmail}</strong>의 가입 요청을 접수했습니다. 새 가입 대상인 주소라면 확인 메일이 도착합니다. 받은편지함과 스팸함에 없다면 이미 가입한 주소일 수 있으니 아래에서 로그인해 주세요.</>
              )}
            </p>
            {resendMessage && <p className="text-xs text-[#1C1C1C]">{resendMessage}</p>}
            {errorMsg && <p className="text-xs text-red-600" role="alert">{errorMsg}</p>}
            <button data-button-id="welcome-modal-button-07"
              type="button"
              onClick={() => void handleResend(confirmationEmail)}
              disabled={isResending}
              className="w-full py-3.5 bg-[#1C1C1C] text-white font-extrabold text-sm rounded-2xl disabled:opacity-50"
            >
              {isResending ? '요청 중…' : '확인 메일 다시 요청하기'}
            </button>
            <button data-button-id="welcome-modal-button-08"
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
        ) : emailCheckEnabled && emailCheckPhase === 'pending' ? (
          <div className="space-y-4 text-left" role="status">
            <p className="text-sm text-[#1C1C1C]">이 이메일은 가입 확인이 아직 끝나지 않았습니다. 받은 가입 확인 메일의 링크를 열거나 확인 메일을 다시 요청해 주세요.</p>
            {errorMsg && <p role="alert" className="text-xs text-red-600">{errorMsg}</p>}
            <button data-button-id="welcome-modal-button-09" type="button" disabled={isResending}
              onClick={() => void handleResend(email)}
              className="w-full py-3.5 bg-[#1C1C1C] text-white font-extrabold text-sm rounded-2xl disabled:opacity-50">
              {isResending ? '요청 중…' : '가입 확인 메일 다시 요청하기'}
            </button>
            <button data-button-id="welcome-modal-button-10" type="button" onClick={() => { setEmail(''); setEmailCheckPhase('entry'); }}
              className="w-full text-xs font-bold text-[#5f5e5e] hover:underline">다른 이메일 사용하기</button>
          </div>
        ) : emailCheckEnabled && !isLoginMode && emailCheckPhase !== 'available' ? (
          <form onSubmit={handleEmailCheck} className="space-y-4 text-left">
            {emailCheckPhase === 'verifying' ? (
              <p className="text-sm text-[#1C1C1C]">확인 링크를 처리하는 중입니다.</p>
            ) : emailCheckPhase === 'sent' ? (
              <p className="text-sm text-[#1C1C1C]">입력한 이메일의 받은편지함과 스팸함에서 소유 확인 링크를 열어 주세요. 링크는 10분 동안 사용할 수 있습니다.</p>
            ) : (
              <p className="text-sm text-[#1C1C1C]">가입 여부는 해당 이메일을 받을 수 있는 사람에게만 알려드립니다. 확인 링크를 먼저 보내겠습니다.</p>
            )}
            {emailCheckPhase !== 'verifying' && <>
              <label htmlFor="signup-check-email" className="block text-xs font-bold text-[#1C1C1C]">이메일</label>
              <input id="signup-check-email" type="email" value={email}
                onChange={(event) => setEmail(event.target.value)} required
                className="w-full p-3 text-sm bg-[#f8f9fa] border border-[#E5E7EB] rounded-2xl text-[#1C1C1C]"
                placeholder="example@email.com" />
              {emailCheckError && <p role="alert" className="text-xs text-red-600">{emailCheckError}</p>}
              <button data-button-id="welcome-modal-button-11" type="submit" disabled={emailCheckLoading}
                className="w-full py-3.5 bg-[#1C1C1C] text-white font-extrabold text-sm rounded-2xl disabled:opacity-50">
                {emailCheckLoading ? '요청 중…' : emailCheckPhase === 'sent' ? '확인 링크 다시 요청하기' : '이메일 소유 확인하기'}
              </button>
            </>}
          </form>
        ) : <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {emailCheckEnabled && emailCheckPhase === 'registered' && isLoginMode &&
            <p className="text-sm text-[#1C1C1C]">이 이메일로 등록된 계정이 있습니다. 비밀번호를 입력해 로그인해 주세요.</p>}
          {emailCheckEnabled && emailCheckPhase === 'available' && !isLoginMode &&
            <p className="text-sm text-[#1C1C1C]">이메일 소유 확인이 끝났습니다. 비밀번호와 닉네임을 정하면 가입이 완료됩니다.</p>}
          
          <div>
            <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={emailCheckEnabled && emailCheckPhase === 'available' && !isLoginMode}
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

          <button data-button-id="welcome-modal-button-12"
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-[#1C1C1C] hover:bg-[#333333] text-white font-extrabold text-sm rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{isLoginMode ? '로그인하기' : '니편내편 시작하기'}</span>
            {!isLoading && <Check className="w-4 h-4 text-[#FF6B5A]" />}
          </button>
          {isLoginMode && (
            <button data-button-id="welcome-modal-button-13" type="button" onClick={() => { setRecoveryError(''); setRecoveryPhase('request'); }}
              className="w-full text-xs font-bold text-[#5f5e5e] hover:underline">
              비밀번호를 잊으셨나요?
            </button>
          )}
        </form>}

        {recoveryPhase === 'idle' && <button data-button-id="welcome-modal-button-14"
          type="button"
          onClick={() => {
            setShowExpiredLink(false);
            onGuestBrowse();
          }}
          className="w-full py-3 bg-white border border-[#E5E7EB] text-[#5f5e5e] font-bold text-sm rounded-2xl hover:bg-[#f3f4f5] active:scale-95 transition-all cursor-pointer"
        >
          로그인 없이 둘러보기
        </button>}

        {recoveryPhase !== 'updating' && recoveryPhase !== 'done' && <div className="pt-2 border-t border-[#E5E7EB] text-xs font-bold text-[#5f5e5e]">
          {recoveryPhase !== 'idle' ? (
            <button data-button-id="welcome-modal-button-15" type="button" onClick={() => { setRecoveryPhase('idle'); setRecoveryError(''); }}
              className="text-[#FF6B5A] hover:underline">로그인으로 돌아가기</button>
          ) : <>
          {confirmationEmail || showExpiredLink ? '이미 확인하셨나요? ' : isLoginMode ? "아직 계정이 없으신가요? " : "이미 계정이 있으신가요? "}
          <button data-button-id="welcome-modal-button-16"
            type="button" 
            onClick={() => {
              if (emailCheckEnabled && isLoginMode && emailCheckPhase === 'registered') {
                setEmail('');
                setEmailCheckPhase('entry');
              }
              if (emailCheckEnabled && !isLoginMode && emailCheckPhase === 'available') {
                setSignupToken(null);
                setEmailCheckPhase('entry');
              }
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
          </>}
        </div>}
      </div>
    </div>
  );
};
