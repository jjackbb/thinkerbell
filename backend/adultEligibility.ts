import type { Express, Request, Response } from 'express';
import { ADULT_POLICY_VERSION } from '../frontend/src/lib/adultPolicy.js';

export class AdultEligibilityError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
type RpcClient = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> };
export function adultEligibilityEnabled(): boolean { return process.env.ADULT_ELIGIBILITY_READY === 'true'; }

export type AdultStatus = { eligible: boolean; policyVersion: string; attestedAt: string | null };

export function validateAdultAttestation(body: unknown): void {
  const value = body && typeof body === 'object' ? body as Record<string, unknown> : null;
  if (value?.isAdult !== true) {
    throw new AdultEligibilityError(403, 'ADULT_ATTESTATION_REQUIRED');
  }
  if (value.policyVersion !== ADULT_POLICY_VERSION) {
    throw new AdultEligibilityError(409, 'ADULT_POLICY_CHANGED');
  }
}

export function createAdultEligibility({ client, now = Date.now }: { client: () => RpcClient; now?: () => number }) {
  async function getStatus(userId: string): Promise<AdultStatus> {
    if (!userId) throw new AdultEligibilityError(401, 'AUTH_REQUIRED');
    let result: Awaited<ReturnType<RpcClient['rpc']>>;
    try { result = await client().rpc('read_adult_eligibility', { p_user_id: userId }); }
    catch { throw new AdultEligibilityError(503, 'ADULT_ELIGIBILITY_UNAVAILABLE'); }
    if (result.error) throw new AdultEligibilityError(503, 'ADULT_ELIGIBILITY_UNAVAILABLE');
    const row = result.data as { policy_version?: unknown; attested_at?: unknown } | null;
    const timestamp = typeof row?.attested_at === 'string' ? Date.parse(row.attested_at) : NaN;
    const eligible = row?.policy_version === ADULT_POLICY_VERSION && Number.isFinite(timestamp) && timestamp <= now();
    return { eligible, policyVersion: ADULT_POLICY_VERSION, attestedAt: eligible ? row!.attested_at as string : null };
  }
  async function requireAdultEligibility(userId: string): Promise<void> {
    if (!(await getStatus(userId)).eligible) throw new AdultEligibilityError(403, 'ADULT_ATTESTATION_REQUIRED');
  }
  async function attest(userId: string, body: unknown): Promise<AdultStatus> {
    if (!userId) throw new AdultEligibilityError(401, 'AUTH_REQUIRED');
    validateAdultAttestation(body);
    try {
      const { error } = await client().rpc('attest_adult_eligibility', {
        p_user_id: userId, p_policy_version: ADULT_POLICY_VERSION, p_is_adult: true,
      });
      if (error) throw error;
    } catch { throw new AdultEligibilityError(503, 'ADULT_ELIGIBILITY_UNAVAILABLE'); }
    const status = await getStatus(userId);
    if (!status.eligible) throw new AdultEligibilityError(503, 'ADULT_ELIGIBILITY_UNAVAILABLE');
    return status;
  }
  return { getStatus, requireAdultEligibility, attest };
}

export function registerAdultEligibilityRoutes(app: Express, options: {
  authenticate: (req: Request) => Promise<{ id: string }>;
  eligibility: ReturnType<typeof createAdultEligibility>;
  sendError: (res: Response, error: unknown) => unknown;
  enabled?: () => boolean;
}) {
  for (const method of ['get', 'post'] as const) {
    app[method]('/api/account/adult-eligibility', async (req, res) => {
      res.set('Cache-Control', 'no-store');
      try {
        // ID exclusively from verified auth.getUser(), never body or metadata.
        const user = await options.authenticate(req);
        if (!(options.enabled ?? adultEligibilityEnabled)()) {
          if (method === 'post') throw new AdultEligibilityError(503, 'ADULT_ELIGIBILITY_UNAVAILABLE');
          return void res.json({ enabled: false, eligible: false, policyVersion: ADULT_POLICY_VERSION, attestedAt: null });
        }
        const status = method === 'get' ? await options.eligibility.getStatus(user.id)
          : await options.eligibility.attest(user.id, req.body);
        res.json({ enabled: true, ...status });
      } catch (error) {
        if (error instanceof AdultEligibilityError) res.status(error.status).json({ error: error.code });
        else options.sendError(res, error);
      }
    });
  }
}
