import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { WelcomeModal } from '../../../frontend/src/components/WelcomeModal';
import { PrivacyNoticeDraft, PrivacyNoticeDraftContent, SignupPrivacyNoticeDraft } from '../../../frontend/src/components/PrivacyNoticeDraft';
import { AnalyticsConsentSettings } from '../../../frontend/src/components/AnalyticsConsent';
import '../../../frontend/src/index.css';

function Preview() {
  const [initialNotice, setInitialNotice] = useState(new URLSearchParams(location.search).has('initialNotice'));
  const [signup, setSignup] = useState(false);
  return <main className="mx-auto max-w-xl p-5 text-[#1C1C1C]">
    <h1 className="mb-4 text-2xl font-bold">개인정보처리방침 검토 초안</h1>
    <p className="mb-4">게시 전 검토용입니다. 실제 가입이나 동의를 받지 않습니다.</p>
    <button type="button" className="mb-4 min-h-11 underline" onClick={() => setSignup(true)}>가입 화면 검토하기</button>
    <PrivacyNoticeDraftContent />
    <PrivacyNoticeDraft isOpen={initialNotice} onClose={() => setInitialNotice(false)} />
    <AnalyticsConsentSettings />
    <WelcomeModal isOpen={signup} signupNoticePreview={<SignupPrivacyNoticeDraft />} onGuestBrowse={() => setSignup(false)} onComplete={() => {}} onSignupCreated={() => {}} canStartSignupLogin={() => false} onPasswordRecoveryComplete={() => {}} />
  </main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Preview /></StrictMode>);
