import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

const originalFetch = globalThis.fetch;
const ownerId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const rows = new Map();
let providerCalls = 0;
let insertCalls = 0;
let simulateInsertConflict = false;

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SECRET_KEY = 'test-secret-key';
process.env.POTENS_API_KEY = 'test-potens-key';

globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  const method = init?.method ?? 'GET';
  const headers = new Headers(init?.headers);
  if (url.hostname === 'ai.potens.ai') {
    providerCalls += 1;
    return Response.json({ message: JSON.stringify({
      isAdult: false,
      hasProfanity: false,
      sanitizedTitle: '시험 제목',
      sanitizedText: '중복 저장을 확인하기 위한 충분히 긴 합성 사연 본문입니다.',
    }) });
  }
  if (url.hostname === 'example.supabase.co' && url.pathname === '/auth/v1/user') {
    const userId = headers.get('authorization') === 'Bearer token-other' ? otherId : ownerId;
    return Response.json({ id: userId, aud: 'authenticated', user_metadata: { nickname: '시험' }, app_metadata: {} });
  }
  if (url.hostname === 'example.supabase.co' && url.pathname === '/rest/v1/stories') {
    if (method === 'GET') {
      const id = url.searchParams.get('id')?.replace(/^eq\./, '');
      const row = id ? rows.get(id) : undefined;
      return Response.json(row ? [row] : []);
    }
    if (method === 'POST') {
      insertCalls += 1;
      const row = JSON.parse(init.body);
      if (simulateInsertConflict) {
        simulateInsertConflict = false;
        rows.set(row.id, row);
        return Response.json({ code: '23505', message: 'duplicate key' }, { status: 409 });
      }
      if (rows.has(row.id)) {
        return Response.json({ code: '23505', message: 'duplicate key' }, { status: 409 });
      }
      rows.set(row.id, row);
      return Response.json(headers.get('accept')?.includes('object+json') ? row : [row], { status: 201 });
    }
  }
  return originalFetch(input, init);
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
  await new Promise((resolve) => server.close(resolve));
  globalThis.fetch = originalFetch;
});

async function save(requestId, token = 'token-owner') {
  const response = await originalFetch(`${baseUrl}/api/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      requestId,
      title: '시험 제목',
      body: '중복 저장을 확인하기 위한 충분히 긴 합성 사연 본문입니다.',
      category: '직장',
      opponentPersonality: '',
    }),
  });
  return { status: response.status, body: await response.json() };
}

test('lost-response retry returns the original story without a second provider call or insert', async () => {
  const id = 'story-33333333-3333-4333-8333-333333333333';
  const first = await save(id);
  assert.equal(first.status, 201);
  assert.equal(first.body.story.id, id);
  assert.equal(first.body.recovered, false);
  const again = await save(id);
  assert.equal(again.status, 200);
  assert.equal(again.body.story.id, id);
  assert.equal(again.body.recovered, true);
  assert.equal(rows.size, 1);
  assert.equal(providerCalls, 1);
  assert.equal(insertCalls, 1);
  const otherUser = await save(id, 'token-other');
  assert.equal(otherUser.status, 409);
  assert.equal(otherUser.body.error, 'STORY_REQUEST_CONFLICT');
});

test('invalid request IDs are rejected before content check or insert', async () => {
  const previousProviderCalls = providerCalls;
  const previousInsertCalls = insertCalls;
  const result = await save('story-not-a-uuid');
  assert.equal(result.status, 400);
  assert.equal(result.body.error, 'INVALID_STORY_REQUEST_ID');
  assert.equal(providerCalls, previousProviderCalls);
  assert.equal(insertCalls, previousInsertCalls);
});

test('an insert collision recovers the already-saved row', async () => {
  simulateInsertConflict = true;
  const id = 'story-44444444-4444-4444-8444-444444444444';
  const result = await save(id);
  assert.equal(result.status, 200);
  assert.equal(result.body.story.id, id);
  assert.equal(result.body.recovered, true);
  assert.equal(rows.size, 2);
});
