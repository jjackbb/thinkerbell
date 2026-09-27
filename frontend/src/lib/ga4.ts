import { hasAnalyticsConsent } from './analyticsConsent';

type GtagWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

const measurementId = (import.meta.env.VITE_GA4_ID as string | undefined)?.trim();
const validMeasurementId = Boolean(measurementId && /^G-[A-Z0-9]+$/.test(measurementId));
let lastPageView: string | null = null;

const safePageLocation = () => `${location.origin}${location.pathname}`;
const safeReferrer = () => {
  try { return document.referrer ? new URL(document.referrer).origin : ''; }
  catch { return ''; }
};

/** 명시적 동의 전에는 Google 스크립트도, 기본 페이지뷰도 시작하지 않는다. */
export function setupGA4(): void {
  if (!hasAnalyticsConsent() || !validMeasurementId || !measurementId) return;
  (window as unknown as Record<string, boolean>)[`ga-disable-${measurementId}`] = false;
  if (document.querySelector(`script[data-ga4="${measurementId}"]`)) return;

  const w = window as GtagWindow;
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  w.gtag('js', new Date());
  w.gtag('config', measurementId, {
    send_page_view: false,
    page_location: safePageLocation(),
    page_title: '니편내편',
    page_referrer: safeReferrer(),
  });

  const loader = document.createElement('script');
  loader.async = true;
  loader.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  loader.dataset.ga4 = measurementId;
  document.head.appendChild(loader);
}

export function sendGA4Event(name: string, props: Record<string, string | number | boolean> = {}): void {
  if (!hasAnalyticsConsent() || !validMeasurementId || !measurementId) return;
  setupGA4();
  (window as GtagWindow).gtag?.('event', name, {
    send_to: measurementId,
    page_location: safePageLocation(),
    page_title: '니편내편',
    page_referrer: safeReferrer(),
    ...props,
  });
}

/** 쿼리 문자열·해시·사연 제목을 페이지 정보로 보내지 않는다. */
export function trackPageView(screenName: 'welcome' | 'feed' | 'ai_chat' | 'mypage'): void {
  if (!hasAnalyticsConsent() || !validMeasurementId || lastPageView === screenName) return;
  lastPageView = screenName;
  sendGA4Event('page_view', {
    page_location: safePageLocation(),
    page_title: '니편내편',
    screen_name: screenName,
    event_schema_version: 2,
  });
}

export function resetPageViewDeduplication(): void {
  lastPageView = null;
}
