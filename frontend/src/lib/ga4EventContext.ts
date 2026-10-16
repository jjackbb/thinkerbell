import { hasAnalyticsConsent, getAnalyticsConsentRevision } from './analyticsConsent';
import { hasAnalyticsAccountEligibility, getAnalyticsAccountRevision } from './analyticsAccountState';
import { analyticsSurfaceBlocked } from './analyticsSurface';

/** No identity or content: a per-operation snapshot for late async outcomes. */
export type GA4EventContext = Readonly<{
  eligible: boolean;
  consentRevision: number;
  accountRevision: number;
}>;

export function captureGA4EventContext(): GA4EventContext {
  return Object.freeze({
    eligible: hasAnalyticsConsent() && hasAnalyticsAccountEligibility() && !analyticsSurfaceBlocked(),
    consentRevision: getAnalyticsConsentRevision(),
    accountRevision: getAnalyticsAccountRevision(),
  });
}

export function isCurrentGA4EventContext(context: GA4EventContext): boolean {
  return context.eligible && hasAnalyticsConsent() && hasAnalyticsAccountEligibility() &&
    context.consentRevision === getAnalyticsConsentRevision() &&
    context.accountRevision === getAnalyticsAccountRevision();
}
