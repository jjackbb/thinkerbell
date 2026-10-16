import type { Express, Request, Response } from 'express';

type AnalyticsUser = { email?: string | null; email_confirmed_at?: string | null };

/** Server-only configuration. Never expose addresses (or hashes) to browser bundles. */
export function analyticsAccountEligible(user: AnalyticsUser, configuredEmails: string | undefined): boolean {
  const emails = configuredEmails?.split(',').map(email => email.trim().toLowerCase()) ?? [];
  // Missing/invalid configuration must not accidentally admit the test accounts.
  if (!emails.length || emails.some(email => !/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email))) return false;
  if (!user.email || !user.email_confirmed_at) return false;
  return !emails.includes(user.email.trim().toLowerCase());
}

export function registerAnalyticsEligibilityRoute(app: Express, dependencies: {
  authenticate: (req: Request) => Promise<AnalyticsUser>;
  configuredEmails?: () => string | undefined;
}) {
  app.get('/api/analytics/eligibility', async (req: Request, res: Response) => {
    res.set('Cache-Control', 'no-store');
    res.set('Vary', 'Authorization');
    try {
      // Never trust user IDs, email query parameters or editable user_metadata.
      const user = await dependencies.authenticate(req);
      const configured = dependencies.configuredEmails?.() ?? process.env.GA4_EXCLUDED_TEST_EMAILS;
      return res.json({ eligible: analyticsAccountEligible(user, configured) });
    } catch {
      // Auth/backend failures reveal neither account information nor raw errors.
      return res.status(503).json({ eligible: false });
    }
  });
}
