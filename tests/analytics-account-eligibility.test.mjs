import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { analyticsAccountEligible, registerAnalyticsEligibilityRoute } from '../backend/analyticsEligibility.ts';
import { installAnalyticsAccountGuard } from '../frontend/src/lib/analyticsAccountGuard.ts';

const user = email => ({ email, email_confirmed_at: '2026-01-01T00:00:00Z' });
const configured = ' QA.One@example.invalid,qa.two@example.invalid, qa.three@example.invalid ';
test('server excludes every configured account, trims whitespace and normalizes email casing', () => {
  for (const email of ['qa.one@example.invalid', 'QA.TWO@EXAMPLE.INVALID', ' qa.three@example.invalid ']) {
    assert.equal(analyticsAccountEligible(user(email), configured), false);
  }
  assert.equal(analyticsAccountEligible(user('member@example.invalid'), configured), true);
});
test('missing/malformed server configuration and missing/unverified identity fail closed', () => {
  for (const value of [undefined, '', ' ', 'qa@example.invalid,', 'invalid', 'not an email@example.invalid']) {
    assert.equal(analyticsAccountEligible(user('member@example.invalid'), value), false);
  }
  for (const identity of [{}, { email: 'member@example.invalid' }, { email_confirmed_at: 'date' }]) {
    assert.equal(analyticsAccountEligible(identity, configured), false);
  }
});

const app = express();
registerAnalyticsEligibilityRoute(app, {
  authenticate: async req => {
    if (req.headers.authorization === 'Bearer test') return user('qa.one@example.invalid');
    if (req.headers.authorization === 'Bearer normal') return user('member@example.invalid');
    throw new Error('private error must not escape');
  }, configuredEmails: () => configured,
});
let server, url;
before(async () => { server = app.listen(0, '127.0.0.1'); await once(server, 'listening'); url = `http://127.0.0.1:${server.address().port}`; });
after(async () => { await new Promise(resolve => server.close(resolve)); });
test('eligibility API uses verified auth only, ignores spoofed email, returns no identifiers and is not cached', async () => {
  for (const [token, expected] of [['test', false], ['normal', true]]) {
    const response = await fetch(`${url}/api/analytics/eligibility?email=attacker@example.invalid&userId=spoofed`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(response.headers.get('vary'), /Authorization/);
    assert.deepEqual(await response.json(), { eligible: expected });
  }
  const response = await fetch(`${url}/api/analytics/eligibility`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { eligible: false });
});

const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const flush = () => new Promise(resolve => setImmediate(resolve));
const session = id => ({ access_token: `synthetic-${id}`, user: { id } });
const response = eligible => ({ ok: true, json: async () => ({ eligible }) });
function harness() {
  const initial = deferred(), states = [], requests = [];
  let callback, unsubscribed = false;
  const dispose = installAnalyticsAccountGuard({
    getSession: () => initial.promise,
    onAuthStateChange: cb => { callback = cb; return { data: { subscription: { unsubscribe: () => { unsubscribed = true; } } } }; },
  }, {
    publish: state => states.push(state),
    request: (path, options) => { const result = deferred(); requests.push({ path, options, ...result }); return result.promise; },
  });
  return { initial, states, requests, dispose, emit: (state, event = 'SIGNED_IN') => callback(event, state), isUnsubscribed: () => unsubscribed };
}
test('initial restoration is blocked synchronously until signed-in account is checked', async () => {
  const h = harness();
  try {
    assert.deepEqual(h.states, ['pending']);
    h.initial.resolve({ data: { session: session('test') } }); await flush();
    assert.deepEqual(h.states, ['pending']); assert.equal(h.requests.length, 1);
    assert.equal(h.requests[0].path, '/api/analytics/eligibility');
    assert.deepEqual(h.requests[0].options.headers, { Authorization: 'Bearer synthetic-test' });
    assert.equal(h.requests[0].options.cache, 'no-store');
    h.requests[0].resolve(response(false)); await flush();
    assert.deepEqual(h.states, ['pending', 'blocked']);
  } finally { h.dispose(); }
});
test('confirmed anonymous visitor needs no server lookup and may be eligible after consent', async () => {
  const h = harness();
  try { h.initial.resolve({ data: { session: null } }); await flush(); assert.equal(h.states.at(-1), 'allowed'); assert.equal(h.requests.length, 0); }
  finally { h.dispose(); }
});
test('late initial session never overwrites a newer login', async () => {
  const h = harness();
  try {
    h.emit(session('test')); await flush();
    h.initial.resolve({ data: { session: null } }); await flush();
    h.requests[0].resolve(response(false)); await flush();
    assert.equal(h.states.includes('allowed'), false);
  } finally { h.dispose(); }
});
test('normal-to-test account switch blocks immediately and rejects late normal-account response', async () => {
  const h = harness();
  try {
    h.initial.resolve({ data: { session: session('normal') } }); await flush();
    h.emit(session('test')); assert.equal(h.states.at(-1), 'pending'); await flush();
    assert.equal(h.requests[0].options.signal.aborted, true);
    h.requests[1].resolve(response(false)); await flush();
    h.requests[0].resolve(response(true)); await flush();
    assert.equal(h.states.at(-1), 'blocked'); assert.equal(h.states.includes('allowed'), false);
  } finally { h.dispose(); }
});
test('logout clears the old decision and a later normal login gets a fresh server decision', async () => {
  const h = harness();
  try {
    h.initial.resolve({ data: { session: session('test') } }); await flush();
    h.requests[0].resolve(response(false)); await flush();
    h.emit(null, 'SIGNED_OUT'); assert.equal(h.states.at(-1), 'pending'); await flush(); assert.equal(h.states.at(-1), 'allowed');
    h.emit(session('normal')); assert.equal(h.states.at(-1), 'pending'); await flush();
    h.requests[1].resolve(response(true)); await flush(); assert.equal(h.states.at(-1), 'allowed');
  } finally { h.dispose(); }
});
test('token refresh revalidates and network/API/malformed replies fail closed', async () => {
  for (const failure of [null, 'network', {}, { eligible: 'true' }]) {
    const h = harness();
    try {
      h.initial.resolve({ data: { session: null } }); await flush();
      h.emit(session('normal'), 'TOKEN_REFRESHED'); await flush();
      if (failure === 'network') h.requests[0].reject(Error('network'));
      else h.requests[0].resolve(failure === null ? { ok: false } : { ok: true, json: async () => failure });
      await flush(); assert.equal(h.states.at(-1), 'blocked');
    } finally { h.dispose(); }
  }
});
test('initial auth error and disposal never allow a late session result', async () => {
  const h = harness(); h.initial.resolve({ data: { session: null }, error: Error('auth') }); await flush();
  assert.equal(h.states.at(-1), 'blocked'); h.dispose(); assert.equal(h.isUnsubscribed(), true);
  const later = harness(); later.dispose(); later.initial.resolve({ data: { session: null } }); await flush();
  assert.equal(later.states.includes('allowed'), false);
});

test('INITIAL_SESSION(null) cannot turn a restoration error into anonymous eligibility, in either arrival order', async () => {
  for (const eventFirst of [true, false]) {
    const h = harness();
    try {
      if (eventFirst) { h.emit(null, 'INITIAL_SESSION'); await flush(); }
      h.initial.resolve({ data: { session: null }, error: Error('restore failed') }); await flush();
      if (!eventFirst) { h.emit(null, 'INITIAL_SESSION'); await flush(); }
      assert.equal(h.states.includes('allowed'), false);
      assert.equal(h.states.at(-1), 'blocked');
      assert.equal(h.requests.length, 0);
    } finally { h.dispose(); }
  }
});
test('INITIAL_SESSION never bypasses a rejected explicit restoration, with or without a session', async () => {
  for (const eventFirst of [true, false]) {
    for (const notifiedSession of [null, session('normal')]) {
      const h = harness();
      try {
        if (eventFirst) { h.emit(notifiedSession, 'INITIAL_SESSION'); await flush(); }
        h.initial.reject(Error('restore rejected')); await flush();
        if (!eventFirst) { h.emit(notifiedSession, 'INITIAL_SESSION'); await flush(); }
        assert.equal(h.states.includes('allowed'), false);
        assert.equal(h.states.at(-1), 'blocked');
        assert.equal(h.requests.length, 0);
      } finally { h.dispose(); }
    }
  }
});
test('INITIAL_SESSION waits for explicit successful anonymous restoration and cannot override a later signed-in exclusion', async () => {
  const anonymous = harness();
  try {
    anonymous.emit(null, 'INITIAL_SESSION'); await flush();
    assert.deepEqual(anonymous.states, ['pending']);
    anonymous.initial.resolve({ data: { session: null }, error: null }); await flush();
    assert.equal(anonymous.states.at(-1), 'allowed');
  } finally { anonymous.dispose(); }
  const account = harness();
  try {
    account.emit(session('test')); await flush();
    account.emit(null, 'INITIAL_SESSION');
    account.initial.resolve({ data: { session: null }, error: Error('old read') }); await flush();
    account.requests[0].resolve(response(false)); await flush();
    assert.equal(account.states.includes('allowed'), false);
    assert.equal(account.states.at(-1), 'blocked');
  } finally { account.dispose(); }
});
