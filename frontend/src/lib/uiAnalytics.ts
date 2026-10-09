import { track } from './events';
import { hasAnalyticsConsent, ANALYTICS_CONSENT_CHANGED } from './analyticsConsent';
import { currentAnalyticsScreen } from './analyticsSurface';
import { getAnalyticsControl } from './analyticsControls';

/** One delegated listener: no handler replacement and no scraping of labels/hrefs. */
export function installUiAnalytics(): () => void {
  let lastScreen: string | null = null;
  let lastConsent = hasAnalyticsConsent();
  const observeScreen = () => {
    const consent = hasAnalyticsConsent();
    if (!consent) { lastScreen = null; lastConsent = false; return; }
    if (!lastConsent) lastScreen = null;
    lastConsent = true;
    const screen = currentAnalyticsScreen();
    if (!screen) { lastScreen = null; return; }
    if (screen === lastScreen) return;
    lastScreen = screen;
    track('page_view', { screen });
  };
  const click = (event: MouseEvent) => {
    if (!(event.target instanceof Element) || !hasAnalyticsConsent()) return;
    const element = event.target.closest<HTMLElement>('[data-button-id], [data-action-id], [data-analytics-ignore]');
    if (!element || element.hasAttribute('data-analytics-ignore') || element.closest('[data-analytics-exclude="true"]') || element.matches(':disabled, [aria-disabled="true"]')) return;
    const id = element.dataset.buttonId ?? element.dataset.actionId;
    const control = getAnalyticsControl(id);
    const screen = currentAnalyticsScreen();
    if (!control || control.excluded || !screen) return;
    track('ui_click', { screen, button_id: id, element_type: control.kind });
  };
  document.addEventListener('click', click, true);
  const observer = new MutationObserver(observeScreen);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true,
    attributeFilter: ['data-analytics-screen', 'data-analytics-layer', 'hidden', 'style'] });
  window.addEventListener(ANALYTICS_CONSENT_CHANGED, observeScreen);
  const storage = (event: StorageEvent) => { if (event.key === 'nipyeon_analytics_consent_v1') observeScreen(); };
  window.addEventListener('storage', storage);
  observeScreen();
  return () => {
    observer.disconnect(); document.removeEventListener('click', click, true);
    window.removeEventListener(ANALYTICS_CONSENT_CHANGED, observeScreen);
    window.removeEventListener('storage', storage);
  };
}
