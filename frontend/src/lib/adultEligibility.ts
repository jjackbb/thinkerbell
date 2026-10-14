import { ADULT_POLICY_VERSION } from './adultPolicy';
import { supabase } from './supabase';

export type AdultEligibilityStatus = { enabled: boolean; eligible: boolean; policyVersion: string; attestedAt: string | null };

/** The server verifies the bearer. Never read or write user_metadata for authority. */
export async function requestAdultEligibility(userId: string, attest = false): Promise<AdultEligibilityStatus> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token || session.user.id !== userId) throw new Error('AUTH_REQUIRED');
  const response = await fetch('/api/account/adult-eligibility', {
    method: attest ? 'POST' : 'GET', cache: 'no-store',
    headers: { Authorization: `Bearer ${session.access_token}`, ...(attest ? { 'Content-Type': 'application/json' } : {}) },
    ...(attest ? { body: JSON.stringify({ isAdult: true, policyVersion: ADULT_POLICY_VERSION }) } : {}),
  });
  const result = await response.json();
  if (!response.ok || typeof result.enabled !== 'boolean' || typeof result.eligible !== 'boolean' ||
      result.policyVersion !== ADULT_POLICY_VERSION) throw new Error('ADULT_ELIGIBILITY_UNAVAILABLE');
  return result;
}
