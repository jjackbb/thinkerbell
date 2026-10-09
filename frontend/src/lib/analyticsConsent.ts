import { RECRUITMENT_STORAGE_KEY } from './analyticsContext';

export type AnalyticsConsent = 'unknown' | 'accepted' | 'refused';

const CONSENT_KEY = 'nipyeon_analytics_consent_v1';
const measurementId = (import.meta.env.VITE_GA4_ID as string | undefined)?.trim();
export const ANALYTICS_CONSENT_CHANGED = 'nipyeon:analytics-consent-changed';
let memoryConsent: AnalyticsConsent = 'unknown';
let consentRevision = 0;
export const getAnalyticsConsentRevision = () => consentRevision;
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key === CONSENT_KEY) consentRevision += 1;
});

function disableGA4(disabled: boolean): void {
  if (measurementId && /^G-[A-Z0-9]+$/.test(measurementId)) {
    (window as unknown as Record<string, boolean>)[`ga-disable-${measurementId}`] = disabled;
  }
}

function clearAnalyticsCookies(): void {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.trim().split('=')[0];
    if (/^_ga(?:_|$)/.test(name)) {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    }
  }
}

export function getAnalyticsConsent(): AnalyticsConsent {
  if (memoryConsent !== 'unknown') return memoryConsent;
  try {
    const saved = localStorage.getItem(CONSENT_KEY);
    if (saved === 'accepted' || saved === 'refused') return saved;
  } catch {
    // 저장소가 차단된 브라우저에서는 현재 탭의 선택만 유지한다.
  }
  return memoryConsent;
}

export function hasAnalyticsConsent(): boolean {
  return getAnalyticsConsent() === 'accepted';
}

/** 이전 방문에서 거부한 경우 태그 실행보다 먼저 공식 차단 플래그를 세운다. */
export function enforceAnalyticsRefusal(): void {
  if (getAnalyticsConsent() === 'refused') {
    disableGA4(true);
    clearAnalyticsCookies();
    try { sessionStorage.removeItem(RECRUITMENT_STORAGE_KEY); } catch { /* optional storage */ }
  }
}

export function setAnalyticsConsent(consent: Exclude<AnalyticsConsent, 'unknown'>): void {
  consentRevision += 1;
  disableGA4(consent === 'refused');
  memoryConsent = consent;
  try {
    localStorage.setItem(CONSENT_KEY, consent);
    memoryConsent = 'unknown';
  } catch {
    // 저장에 실패해도 현재 탭에서 거부·철회가 즉시 적용되어야 한다.
  }

  if (consent === 'refused') {
    // 이미 수집된 서버 데이터까지 삭제하는 동작은 아니다.
    clearAnalyticsCookies();
    try { sessionStorage.removeItem(RECRUITMENT_STORAGE_KEY); } catch { /* optional storage */ }
  }
  window.dispatchEvent(new Event(ANALYTICS_CONSENT_CHANGED));
}
