import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { once } from 'node:events';

process.env.EMAIL_CHECK_ENABLED = 'true';
process.env.EMAIL_CHECK_SECRET = Buffer.alloc(32, 7).toString('base64');
process.env.RESEND_EMAIL_CHECK_API_KEY = 'synthetic-sending-key';
process.env.APP_URL = 'http://localhost:3000/';
process.env.SUPABASE_URL = 'https://synthetic.supabase.co';
process.env.VITE_SUPABASE_URL = 'https://synthetic.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'synthetic-server-secret';

const originalFetch = globalThis.fetch;
const reservations = new Map();
const deliveredTokens = new Map();
let createdUsers = 0;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  if (url.hostname === 'api.resend.com') {
    const body = JSON.parse(init.body);
    assert.ok(['registered@example.com', 'new@example.com'].includes(body.to[0]));
    assert.equal(init.headers.Authorization, 'Bearer synthetic-sending-key');
    deliveredTokens.set(body.to[0], new URL(body.text.match(/http:\/\/localhost:3000\/#email_check=[A-Za-z0-9_-]+/)?.[0]).hash.slice('#email_check='.length));
    return Response.json({ id: 'synthetic-email' });
  }
  if (url.pathname === '/rest/v1/rpc/reserve_signup_email_check') {
    const body = JSON.parse(init.body);
    assert.equal(Object.hasOwn(body, 'email'), false);
    assert.match(body.p_email_digest, /^[0-9a-f]{64}$/);
    reservations.set(body.p_id, body);
    return Response.json(true);
  }
  if (url.pathname === '/rest/v1/rpc/consume_signup_email_check') {
    const body = JSON.parse(init.body);
    const saved = reservations.get(body.p_id);
    if (!saved || saved.used || saved.p_token_digest !== body.p_token_digest ||
        saved.p_email_digest !== body.p_email_digest) {
      return Response.json({ code: 'P0001', message: 'EMAIL_CHECK_LINK_UNAVAILABLE' }, { status: 400 });
    }
    saved.used = true;
    saved.signupDigest = body.p_signup_digest;
    return Response.json(body.p_email === 'registered@example.com' ? 'registered' : 'available');
  }
  if (url.pathname === '/rest/v1/rpc/claim_signup_email_check') {
    const body = JSON.parse(init.body);
    const saved = [...reservations.values()].find(item =>
      item.p_email_digest === body.p_email_digest && item.signupDigest === body.p_signup_digest);
    if (!saved || !saved.used || saved.claimed) {
      return Response.json({ code: 'P0001', message: 'EMAIL_CHECK_LINK_UNAVAILABLE' }, { status: 400 });
    }
    saved.claimed = true;
    return Response.json('available');
  }
  if (url.pathname === '/auth/v1/admin/users') {
    const body = JSON.parse(init.body);
    assert.equal(body.email, 'new@example.com');
    assert.equal(body.email_confirm, true);
    assert.equal(body.user_metadata.nickname, '새계정');
    assert.equal(body.password, 'synthetic-password');
    createdUsers += 1;
    return Response.json({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: body.email });
  }
  throw new Error(`Unexpected synthetic route ${url.pathname}`);
};

const { default: app } = await import('../backend/app.ts');
let server;
let baseUrl;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  globalThis.fetch = originalFetch;
});

async function post(path, body) {
  const response = await originalFetch(baseUrl + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

test('account status is visible only after the mailbox token is consumed', async () => {
  const requested = await post('/api/auth/email-check/request', { email: 'REGISTERED@example.com' });
  assert.equal(requested.status, 202);
  assert.equal(Object.hasOwn(requested.body, 'status'), false);
  const deliveredToken = deliveredTokens.get('registered@example.com');
  assert.ok(deliveredToken);

  const invalid = await post('/api/auth/email-check/verify', { token: deliveredToken + 'x' });
  assert.equal(invalid.status, 410);
  const verified = await post('/api/auth/email-check/verify', { token: deliveredToken });
  assert.equal(verified.status, 200);
  assert.deepEqual(verified.body, { status: 'registered', email: 'registered@example.com' });
  const replayed = await post('/api/auth/email-check/verify', { token: deliveredToken });
  assert.equal(replayed.status, 410);
});

test('new account is created once only after mailbox proof, without a second signup email', async () => {
  const requested = await post('/api/auth/email-check/request', { email: 'new@example.com' });
  assert.equal(requested.status, 202);
  const token = deliveredTokens.get('new@example.com');
  const verified = await post('/api/auth/email-check/verify', { token });
  assert.equal(verified.status, 200);
  assert.equal(verified.body.status, 'available');
  assert.match(verified.body.signupToken, /^[A-Za-z0-9_-]{43}$/);

  const signup = { email: 'new@example.com', password: 'synthetic-password',
    nickname: '새계정', signupToken: verified.body.signupToken };
  const created = await post('/api/auth/email-check/signup', signup);
  assert.equal(created.status, 201);
  assert.deepEqual(created.body, { created: true });
  const replay = await post('/api/auth/email-check/signup', signup);
  assert.equal(replay.status, 410);
  assert.equal(createdUsers, 1);
});
