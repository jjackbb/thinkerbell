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
let deliveredToken;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  if (url.hostname === 'api.resend.com') {
    const body = JSON.parse(init.body);
    assert.equal(body.to[0], 'registered@example.com');
    assert.equal(init.headers.Authorization, 'Bearer synthetic-sending-key');
    deliveredToken = new URL(body.text.match(/http:\/\/localhost:3000\/#email_check=[A-Za-z0-9_-]+/)?.[0]).hash.slice('#email_check='.length);
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
    return Response.json(body.p_email === 'registered@example.com' ? 'registered' : 'available');
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
  assert.ok(deliveredToken);

  const invalid = await post('/api/auth/email-check/verify', { token: deliveredToken + 'x' });
  assert.equal(invalid.status, 410);
  const verified = await post('/api/auth/email-check/verify', { token: deliveredToken });
  assert.equal(verified.status, 200);
  assert.deepEqual(verified.body, { status: 'registered', email: 'registered@example.com' });
  const replayed = await post('/api/auth/email-check/verify', { token: deliveredToken });
  assert.equal(replayed.status, 410);
});
