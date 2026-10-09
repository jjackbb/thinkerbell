import { landingCtaHref } from './lib/signupLanding';
import { enforceAnalyticsRefusal, getAnalyticsConsent, setAnalyticsConsent, ANALYTICS_CONSENT_CHANGED } from './lib/analyticsConsent';
import { setupGA4 } from './lib/ga4';
import { installUiAnalytics } from './lib/uiAnalytics';

enforceAnalyticsRefusal();
setupGA4();
const dispose = installUiAnalytics();
const banner = document.getElementById('landing-consent');
const update = () => { if (banner) banner.hidden = getAnalyticsConsent() !== 'unknown'; };
document.getElementById('landing-refuse')?.addEventListener('click', () => setAnalyticsConsent('refused'));
document.getElementById('landing-accept')?.addEventListener('click', () => setAnalyticsConsent('accepted'));
window.addEventListener(ANALYTICS_CONSENT_CHANGED, update);
window.addEventListener('storage', event => {
  if (event.key === 'nipyeon_analytics_consent_v1') { enforceAnalyticsRefusal(); update(); }
});
update();
if (import.meta.hot) import.meta.hot.dispose(dispose);
// Demo handlers in landing.html change only their local example UI.
// This module records fixed page_view/ui_click only, never vote/comment outcomes.

for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-landing-cta]')) {
  const action = link.dataset.landingCta;
  if (action === 'write' || action === 'browse') link.href = landingCtaHref(action, new URLSearchParams(location.search).get('source'));
}
