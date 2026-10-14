import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import express from 'express';
import { createAdultEligibility, registerAdultEligibilityRoutes, validateAdultAttestation, adultEligibilityEnabled } from '../backend/adultEligibility.ts';
import { registerEmailOwnershipRoutes } from '../backend/emailOwnership.ts';
import { ADULT_POLICY_VERSION } from '../frontend/src/lib/adultPolicy.ts';
const body = { isAdult: true, policyVersion: ADULT_POLICY_VERSION };
const now = Date.parse('2026-10-14T12:00:00Z');
const row = { policy_version: ADULT_POLICY_VERSION, attested_at: '2026-10-14T11:00:00Z' };
const helper = data => createAdultEligibility({ client: () => ({ rpc: async () => ({ data, error: null }) }), now: () => now });

for (const value of [undefined, null, {}, { ...body, isAdult: false }, { ...body, isAdult: 'true' }, { ...body, isAdult: 18 }]) {
  test(`rejects missing/non-true attestation ${JSON.stringify(value)}`, () => assert.throws(() => validateAdultAttestation(value), { code: 'ADULT_ATTESTATION_REQUIRED' }));
}
test('requires exact current policy', () => {
  assert.throws(() => validateAdultAttestation({ isAdult: true, policyVersion: 'old' }), { code: 'ADULT_POLICY_CHANGED' });
  assert.doesNotThrow(() => validateAdultAttestation(body));
});
test('default off and exact true only', () => {
  const old = process.env.ADULT_ELIGIBILITY_READY;
  try { delete process.env.ADULT_ELIGIBILITY_READY; assert.equal(adultEligibilityEnabled(), false);
    process.env.ADULT_ELIGIBILITY_READY = '1'; assert.equal(adultEligibilityEnabled(), false);
    process.env.ADULT_ELIGIBILITY_READY = 'true'; assert.equal(adultEligibilityEnabled(), true);
  } finally { if (old === undefined) delete process.env.ADULT_ELIGIBILITY_READY; else process.env.ADULT_ELIGIBILITY_READY = old; }
});
for (const value of [null, {}, { ...row, policy_version: 'old' }, { ...row, attested_at: 'bad' }, { ...row, attested_at: '2027-01-01T00:00:00Z' }]) {
  test(`fails closed on absent/stale/invalid ledger ${JSON.stringify(value)}`, async () => {
    assert.equal((await helper(value).getStatus('user')).eligible, false);
    await assert.rejects(helper(value).requireAdultEligibility('user'), { code: 'ADULT_ATTESTATION_REQUIRED' });
  });
}
test('valid service ledger authorizes; empty identity rejected', async () => {
  assert.equal((await helper(row).getStatus('user')).eligible, true);
  await assert.rejects(helper(row).attest('', body), { code: 'AUTH_REQUIRED' });
});
test('RPC failures and thrown clients fail closed', async () => {
  for (const rpc of [async () => ({ data: row, error: new Error('db') }), async () => { throw new Error('network'); }]) {
    await assert.rejects(createAdultEligibility({ client: () => ({ rpc }) }).getStatus('user'), { code: 'ADULT_ELIGIBILITY_UNAVAILABLE' });
  }
});
test('attestation writes only authenticated ID/current version/true, reads back authority', async () => {
  const calls = [];
  const service = createAdultEligibility({ client: () => ({ rpc: async (name, args) => { calls.push([name, args]); return { data: row, error: null }; } }), now: () => now });
  assert.equal((await service.attest('verified-user', { ...body, userId: 'attacker', dateOfBirth: 'ignored', attestedAt: 'forged' })).eligible, true);
  assert.deepEqual(calls[0], ['attest_adult_eligibility', { p_user_id: 'verified-user', p_policy_version: ADULT_POLICY_VERSION, p_is_adult: true }]);
});
async function withApp(register, run) {
  const app = express(); app.use(express.json()); register(app);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('routes authenticate both methods, flag-off skips ledger and forbids writes', async () => {
  let authCalls = 0; let ledgerCalls = 0;
  await withApp(app => registerAdultEligibilityRoutes(app, {
    authenticate: async () => { authCalls++; return { id: 'verified-user' }; },
    enabled: () => false, eligibility: { getStatus: async () => { ledgerCalls++; }, attest: async () => { ledgerCalls++; } },
    sendError: res => res.status(401).json({ error: 'AUTH_REQUIRED' }),
  }), async base => {
    const get = await fetch(`${base}/api/account/adult-eligibility`);
    assert.equal((await get.json()).enabled, false); assert.equal(get.headers.get('cache-control'), 'no-store');
    assert.equal((await fetch(`${base}/api/account/adult-eligibility`, { method: 'POST' })).status, 503);
    assert.equal(authCalls, 2); assert.equal(ledgerCalls, 0);
  });
});
test('POST identity comes only from verified auth, never supplied ID or metadata', async () => {
  let passed;
  await withApp(app => registerAdultEligibilityRoutes(app, {
    authenticate: async () => ({ id: 'verified-user' }), enabled: () => true,
    eligibility: { attest: async (id, value) => { passed = [id, value]; return { eligible: true }; } }, sendError: res => res.sendStatus(401),
  }), async base => {
    const response = await fetch(`${base}/api/account/adult-eligibility`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, userId: 'forged' }) });
    assert.equal(response.status, 200); assert.equal(passed[0], 'verified-user');
  });
});
test('email signup checks age before proof consumption or admin creation', async () => {
  const names = ['ADULT_ELIGIBILITY_READY', 'EMAIL_CHECK_ENABLED', 'EMAIL_CHECK_SECRET', 'RESEND_EMAIL_CHECK_API_KEY', 'APP_URL', 'VERCEL_ENV'];
  const before = Object.fromEntries(names.map(name => [name, process.env[name]]));
  Object.assign(process.env, { ADULT_ELIGIBILITY_READY: 'true', EMAIL_CHECK_ENABLED: 'true', EMAIL_CHECK_SECRET: Buffer.alloc(32, 1).toString('base64'), RESEND_EMAIL_CHECK_API_KEY: 'test-only', APP_URL: 'http://localhost', VERCEL_ENV: 'development' });
  let touched = false;
  try {
    await withApp(app => registerEmailOwnershipRoutes(app, () => { touched = true; throw new Error('must not reach client'); }), async base => {
      const response = await fetch(`${base}/api/auth/email-check/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      assert.equal(response.status, 403); assert.equal(touched, false);
    });
  } finally { for (const name of names) { if (before[name] === undefined) delete process.env[name]; else process.env[name] = before[name]; } }
});
test('SQL draft is service-only, minimal, cascading and idempotent for same version', () => {
  const sql = readFileSync(new URL('../approval-required/adult-eligibility.sql', import.meta.url), 'utf8');
  assert.match(sql, /ON DELETE CASCADE/); assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public.attest_adult_eligibility\(uuid, text, boolean\) FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /TO service_role/); assert.match(sql, /policy_version IS DISTINCT FROM EXCLUDED.policy_version/);
  assert.doesNotMatch(sql, /date_of_birth|birth_date|raw_user_meta_data/i);
});
test('both signup paths share checkbox gate and existing-account banner is non-modal', () => {
  const welcome = readFileSync(new URL('../frontend/src/components/WelcomeModal.tsx', import.meta.url), 'utf8');
  assert.ok(welcome.indexOf('adultGateEnabled && !adultAttested') < welcome.indexOf("fetch('/api/auth/email-check/signup'"));
  assert.ok(welcome.indexOf('adultGateEnabled && !adultAttested') < welcome.indexOf('supabase.auth.signUp('));
  assert.match(welcome, /isAdult: adultAttested, policyVersion: ADULT_POLICY_VERSION/);
  const banner = readFileSync(new URL('../frontend/src/components/AdultEligibilityBanner.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(banner, /role="dialog"|localStorage|user_metadata/);
});

test('unauthenticated GET/POST never access eligibility ledger', async () => {
  let touched = false;
  await withApp(app => registerAdultEligibilityRoutes(app, {
    authenticate: async () => { throw new Error('AUTH_REQUIRED'); }, enabled: () => true,
    eligibility: { getStatus: async () => { touched = true; }, attest: async () => { touched = true; } },
    sendError: res => res.status(401).json({ error: 'AUTH_REQUIRED' }),
  }), async base => {
    for (const method of ['GET', 'POST']) assert.equal((await fetch(`${base}/api/account/adult-eligibility`, { method })).status, 401);
    assert.equal(touched, false);
  });
});

test('production App does not mount or probe the age gate when frontend flag is off',()=>{const app=readFileSync(new URL('../frontend/src/App.tsx',import.meta.url),'utf8');assert.match(app,/import\.meta\.env\.VITE_ADULT_ELIGIBILITY_ENABLED === 'true' && authUserId[^\n]+<AdultEligibilityBanner/);});
