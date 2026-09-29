import { hasAnalyticsConsent } from './analyticsConsent';
import { readRecruitmentSource } from './analyticsContext';

type GtagWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

const measurementId = (import.meta.env.VITE_GA4_ID as string | undefined)?.trim();
const validMeasurementId = Boolean(measurementId && /^G-[A-Z0-9]+$/.test(measurementId));

const releaseId = import.meta.env.VITE_RELEASE_ID as string;
const commonProps = () => {
  const source = readRecruitmentSource();
  return { release_id: releaseId, recruitment_source: source, ...(source === 'technical_test' ? { debug_mode: true } : {}) };
};

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
    ...commonProps(),
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
    ...commonProps(),
  });
}
