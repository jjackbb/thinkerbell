import { useEffect, useState } from 'react';
import {
  ANALYTICS_CONSENT_CHANGED,
  enforceAnalyticsRefusal,
  getAnalyticsConsent,
  type AnalyticsConsent,
} from './analyticsConsent';

export function useAnalyticsConsent(): AnalyticsConsent {
  const [consent, setConsent] = useState<AnalyticsConsent>(getAnalyticsConsent);
  useEffect(() => {
    const update = () => setConsent(getAnalyticsConsent());
    const updateFromStorage = (event: StorageEvent) => {
      if (event.key === 'nipyeon_analytics_consent_v1') {
        enforceAnalyticsRefusal();
        update();
      }
    };
    window.addEventListener(ANALYTICS_CONSENT_CHANGED, update);
    window.addEventListener('storage', updateFromStorage);
    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_CHANGED, update);
      window.removeEventListener('storage', updateFromStorage);
    };
  }, []);
  return consent;
}
