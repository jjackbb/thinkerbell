import { supabase } from './lib/supabase';
import { installAnalyticsAccountGuard } from './lib/analyticsAccountGuard';
import { landingCtaHref } from './lib/signupLanding';
import { enforceAnalyticsRefusal, getAnalyticsConsent, setAnalyticsConsent, ANALYTICS_CONSENT_CHANGED } from './lib/analyticsConsent';
import { setupGA4 } from './lib/ga4';
import { installUiAnalytics } from './lib/uiAnalytics';

enforceAnalyticsRefusal();
const disposeAccountGuard = installAnalyticsAccountGuard(supabase.auth);
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
if (import.meta.hot) import.meta.hot.dispose(() => { dispose(); disposeAccountGuard(); });
// Demo handlers in landing.html change only their local example UI.
// This module records fixed page_view/ui_click only, never vote/comment outcomes.

const ctaSource = new URLSearchParams(location.search).get('source');
const applyCtaHrefs = () => {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-landing-cta]')) {
    const action = link.dataset.landingCta;
    if (action === 'write' || action === 'browse') link.href = landingCtaHref(action, ctaSource);
  }
};
applyCtaHrefs();

/*
  사연 쓰기는 로그인한 사람만 할 수 있다. 첫 화면·마무리의 '사연 올리기'는 숨겨 두고,
  로그인 세션이 확인되면 그때 보여준다. 상단 바는 로그인과 상관없이 홈 버튼이다.
  그래서 비로그인 방문자에게는 사연 올리기 버튼이 잠깐이라도 보이지 않는다.
*/
const applyAuthCtas = (signedIn: boolean) => {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-auth-only]')) link.hidden = !signedIn;
  applyCtaHrefs();
};
void supabase.auth.getSession()
  .then(({ data }) => applyAuthCtas(Boolean(data.session?.user)))
  .catch(() => applyAuthCtas(false));
const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => applyAuthCtas(Boolean(session?.user)));
if (import.meta.hot) import.meta.hot.dispose(() => authListener.subscription.unsubscribe());
