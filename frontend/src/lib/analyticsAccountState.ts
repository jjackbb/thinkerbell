export type AnalyticsAccountState = 'pending' | 'allowed' | 'blocked';
export const ANALYTICS_ACCOUNT_CHANGED = 'nipyeon:analytics-account-changed';
let state: AnalyticsAccountState = 'pending';
let revision = 0;
export const getAnalyticsAccountRevision = () => revision;
const measurementId = (import.meta.env?.VITE_GA4_ID as string | undefined)?.trim();

export const hasAnalyticsAccountEligibility = () => state === 'allowed';

/** Synchronous: block even an already-loaded Google tag before any async auth work. */
export function setAnalyticsAccountState(next: AnalyticsAccountState): void {
  state = next;
  revision += 1;
  if (typeof window === 'undefined') return;
  if (next !== 'allowed') {
    if (measurementId && /^G-[A-Z0-9]+$/.test(measurementId)) {
      (window as unknown as Record<string, boolean>)[`ga-disable-${measurementId}`] = true;
    }
    // Do not replay queued events after an account change. Already-sent events
    // cannot be recalled. Keep Google initialization commands intact.
    const dataLayer = (window as Window & { dataLayer?: unknown[] }).dataLayer;
    if (Array.isArray(dataLayer)) {
      for (let i = dataLayer.length - 1; i >= 0; i--) {
        if ((dataLayer[i] as { 0?: unknown } | null)?.[0] === 'event') dataLayer.splice(i, 1);
      }
    }
  }
  // Re-enabling is owned by setupGA4, which also requires analytics consent.
  window.dispatchEvent(new Event(ANALYTICS_ACCOUNT_CHANGED));
}
