import type { ReactNode } from 'react';
import { setAnalyticsConsent } from '../lib/analyticsConsent';
import { useAnalyticsConsent } from '../lib/useAnalyticsConsent';

export function AnalyticsConsentBanner(): ReactNode {
  const consent = useAnalyticsConsent();
  if (consent !== 'unknown') return null;

  return (
    <section aria-label="선택적 이용 분석 동의" className="relative z-40 border-b border-[#E5E7EB] bg-white shadow-sm">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#1C1C1C]">이용 흐름을 살펴봐도 될까요?</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#5f5e5e]">
            동의하면 사연 조회부터 AI 첫 답변까지의 이용 흐름을 GA4로 분석합니다. 사연·대화 내용은 보내지 않습니다.
            거부해도 계속 이용할 수 있고, 마이 화면에서 언제든 선택을 바꿀 수 있습니다.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button data-button-id="analytics-consent-button-01" type="button" onClick={() => setAnalyticsConsent('refused')} className="min-w-20 rounded-lg border border-[#1C1C1C] px-4 py-2 text-sm font-bold text-[#1C1C1C] cursor-pointer">거부</button>
          <button data-button-id="analytics-consent-button-02" type="button" onClick={() => setAnalyticsConsent('accepted')} className="min-w-20 rounded-lg bg-[#1C1C1C] px-4 py-2 text-sm font-bold text-white cursor-pointer">동의</button>
        </div>
      </div>
    </section>
  );
}

export function AnalyticsConsentSettings(): ReactNode {
  const consent = useAnalyticsConsent();
  return (
    <section aria-label="이용 분석 설정" className="rounded-lg border border-[#E5E7EB] bg-white p-5">
      <h3 className="text-sm font-bold text-[#1C1C1C]">선택적 이용 분석</h3>
      <p className="mt-1 text-xs leading-relaxed text-[#5f5e5e]">
        서비스 개선을 위해 사연 조회와 AI 답변 도달을 집계합니다. 글·대화 내용은 보내지 않으며, 선택을 끄면 이후 행동을 전송하지 않습니다. 이미 수집된 데이터는 이 설정으로 삭제되지 않습니다.
      </p>
      <p className="mt-3 text-xs font-bold text-[#1C1C1C]" aria-live="polite">
        현재 상태: {consent === 'accepted' ? '동의' : consent === 'refused' ? '거부' : '미선택'}
      </p>
      <div className="mt-3 flex gap-2">
        <button data-button-id="analytics-consent-button-03" type="button" onClick={() => setAnalyticsConsent('refused')} disabled={consent === 'refused'} className="rounded-lg border border-[#1C1C1C] px-4 py-2 text-xs font-bold text-[#1C1C1C] cursor-pointer disabled:opacity-50">{consent === 'accepted' ? '동의 철회' : '거부'}</button>
        <button data-button-id="analytics-consent-button-04" type="button" onClick={() => setAnalyticsConsent('accepted')} disabled={consent === 'accepted'} className="rounded-lg bg-[#1C1C1C] px-4 py-2 text-xs font-bold text-white cursor-pointer disabled:opacity-50">동의</button>
      </div>
    </section>
  );
}
