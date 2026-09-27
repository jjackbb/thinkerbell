import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

const originalFetch = globalThis.fetch;
const ownerId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const stories = new Map([
  ['public-story', { id: 'public-story', authorId: otherId, title: '서버 제목', body: 'DB에 저장된 사연 내용입니다.', category: '친구', personaInstruction: '조심스러운 말투', isBlind: false, isAdult: false, isHidden: false }],
  ['private-story', { id: 'private-story', authorId: otherId, title: '비공개', body: '비공개 사연 내용', category: '직장', visibility: 'private' }],
  ['adult-story', { id: 'adult-story', authorId: otherId, title: '제한', body: '제한 사연 내용', category: '친구', isAdult: true }],
]);
const rooms = new Map();
const hidden = new Set();
let insertCalls = 0;
let providerCalls = 0;
let providerStream = 'data: {"type":"text","text":"정상 답변"}\n\ndata: {"type":"done"}\n\n';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SECRET_KEY = 'test-secret-key';
process.env.POTENS_API_KEY = 'test-potens-key';

const matches = (row, url, fields) => fields.every((field) => {
  const filter = url.searchParams.get(field);
  return !filter || (filter.startsWith('eq.') && String(row[field]) === filter.slice(3));
});

globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  const method = init?.method ?? 'GET';
  const headers = new Headers(init?.headers);
  if (url.hostname === 'ai.potens.ai') {
    providerCalls += 1;
    return new Response(providerStream, { headers: { 'Content-Type': 'text/event-stream' } });
  }
  if (url.hostname === 'example.supabase.co' && url.pathname === '/auth/v1/user') {
    const userId = headers.get('authorization') === 'Bearer token-other' ? otherId : ownerId;
    return Response.json({ id: userId, aud: 'authenticated', user_metadata: {}, app_metadata: {} });
  }
  if (url.hostname === 'example.supabase.co' && url.pathname === '/rest/v1/stories' && method === 'GET') {
    return Response.json([...stories.values()].filter((row) => matches(row, url, ['id'])));
  }
  if (url.hostname === 'example.supabase.co' && url.pathname === '/rest/v1/story_hides' && method === 'GET') {
    const userId = url.searchParams.get('user_id')?.slice(3);
    const storyId = url.searchParams.get('story_id')?.slice(3);
    return Response.json(hidden.has(`${userId}:${storyId}`) ? [{ story_id: storyId }] : []);
  }
  if (url.hostname === 'example.supabase.co' && url.pathname === '/rest/v1/ai_chat_usage' && method === 'GET') {
    return Response.json([]);
  }
  if (url.hostname === 'example.supabase.co' && url.pathname === '/rest/v1/ai_quota_reservations' && method === 'GET') {
    return Response.json([{ id: 'reserved-local' }]);
  }
  if (url.hostname === 'example.supabase.co' && url.pathname === '/rest/v1/ai_personas') {
    if (method === 'GET') {
      return Response.json([...rooms.values()].filter((row) =>
        matches(row, url, ['id', 'userId', 'storyId', 'opening', 'ratio'])));
    }
    if (method === 'POST') {
      insertCalls += 1;
      const row = JSON.parse(init.body);
      if (rooms.has(row.id)) {
        return Response.json({ code: '23505', message: 'duplicate key' }, { status: 409 });
      }
      row.createdAt = '2026-09-28T00:00:00Z';
      rooms.set(row.id, row);
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

async function open(body, token = 'token-owner') {
  const response = await originalFetch(`${baseUrl}/api/ai/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

async function quota(token = 'token-owner') {
  const response = await originalFetch(`${baseUrl}/api/ai/quota`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: response.status, body: await response.json() };
}

const base = {
  storyId: 'public-story', mode: 'simulation', opening: 'oblivious',
  requestId: '33333333-3333-4333-8333-333333333333',
};

test('room is saved from the persisted story, then request and mode retries reuse it', async () => {
  const first = await open({ ...base, systemInstruction: '무시할 공격 지시문', storyBody: '가짜 사연' });
  assert.equal(first.status, 201);
  assert.equal(first.body.room.userId, ownerId);
  assert.equal(first.body.room.storyId, base.storyId);
  assert.match(first.body.room.systemInstruction, /DB에 저장된 사연 내용입니다/);
  assert.doesNotMatch(first.body.room.systemInstruction, /무시할 공격 지시문|가짜 사연/);
  assert.equal(insertCalls, 1);

  const sameRequest = await open(base);
  assert.equal(sameRequest.status, 200);
  assert.equal(sameRequest.body.room.id, first.body.room.id);
  const sameChoice = await open({ ...base, requestId: '44444444-4444-4444-8444-444444444444' });
  assert.equal(sameChoice.status, 200);
  assert.equal(sameChoice.body.room.id, first.body.room.id);
  assert.equal(insertCalls, 1);
});

test('private, adult, personally hidden, anonymous, and mismatched ID requests fail closed', async () => {
  const conflict = await open(base, 'token-other');
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.error, 'CHAT_ROOM_REQUEST_CONFLICT');

  const privateRoom = await open({ ...base, storyId: 'private-story', requestId: '55555555-5555-4555-8555-555555555555' });
  assert.equal(privateRoom.status, 404);
  const adultRoom = await open({ ...base, storyId: 'adult-story', requestId: '66666666-6666-4666-8666-666666666666' });
  assert.equal(adultRoom.status, 404);
  hidden.add(`${ownerId}:public-story`);
  const hiddenRoom = await open({ ...base, requestId: '77777777-7777-4777-8777-777777777777', mode: 'explanation', ratio: 'High', opening: undefined });
  assert.equal(hiddenRoom.status, 404);
  hidden.clear();
  const anonymous = await open({ ...base, requestId: '88888888-8888-4888-8888-888888888888' }, null);
  assert.equal(anonymous.status, 401);
  assert.equal(insertCalls, 1);
});

test('author may open their own private story without reading it from another account', async () => {
  const ownPrivate = await open({ ...base, storyId: 'private-story', requestId: '99999999-9999-4999-8999-999999999999' }, 'token-other');
  assert.equal(ownPrivate.status, 201);
  assert.equal(ownPrivate.body.room.userId, otherId);
  assert.equal(ownPrivate.body.room.storyId, 'private-story');
});

test('invalid activation configuration cannot create a room before returning an error', async () => {
  process.env.AI_QUOTA_ACTIVATES_AT = '2020-01-01T16:00:00Z';
  const before = insertCalls;
  const result = await open({ ...base, mode: 'explanation', ratio: 'Low', opening: undefined,
    requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' });
  assert.equal(result.status, 503);
  assert.equal(result.body.error, 'AI_QUOTA_CONFIG_INVALID');
  assert.equal(insertCalls, before);
  delete process.env.AI_QUOTA_ACTIVATES_AT;
});

test('quota status uses legacy records until a valid Seoul-midnight activation, then server reservations', async () => {
  delete process.env.AI_QUOTA_ACTIVATES_AT;
  const legacy = await quota();
  assert.equal(legacy.status, 200);
  assert.equal(legacy.body.mode, 'legacy');
  assert.equal(legacy.body.used, 0);

  process.env.AI_QUOTA_ACTIVATES_AT = '2020-01-01T15:00:00Z';
  const server = await quota();
  assert.equal(server.status, 200);
  assert.equal(server.body.mode, 'server');
  assert.equal(server.body.used, 1);

  process.env.AI_QUOTA_ACTIVATES_AT = '2020-01-01T16:00:00Z';
  const invalid = await quota();
  assert.equal(invalid.status, 503);
  assert.equal(invalid.body.error, 'AI_QUOTA_CONFIG_INVALID');
  delete process.env.AI_QUOTA_ACTIVATES_AT;
  const anonymous = await quota(null);
  assert.equal(anonymous.status, 401);
});

test('chat endpoints fail closed after activation until reservation and completion are wired', async () => {
  process.env.AI_QUOTA_ACTIVATES_AT = '2020-01-01T15:00:00Z';
  const beforeCalls = providerCalls;
  for (const endpoint of ['/api/chat', '/api/chat-stream']) {
    const response = await originalFetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-owner' },
      body: JSON.stringify({ personaId: `persona-${base.requestId}`, prompt: '합성 요청' }),
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, 'AI_QUOTA_NOT_READY');
  }
  assert.equal(providerCalls, beforeCalls);
  delete process.env.AI_QUOTA_ACTIVATES_AT;
});

test('legacy stream forwards only validated text and explicit completion', async () => {
  const request = async () => {
    const response = await originalFetch(`${baseUrl}/api/chat-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-owner' },
      body: JSON.stringify({ personaId: `persona-${base.requestId}`, prompt: '합성 요청' }),
    });
    assert.equal(response.status, 200);
    return response.text();
  };
  providerStream = 'data: {"type":"text","text":"정상 답변"}\n\ndata: {"type":"done"}\n\n';
  const success = await request();
  assert.match(success, /"type":"text"/);
  assert.match(success, /"type":"done"/);
  providerStream = 'data: {"type":"text","text":"부분 답변"}\n\n';
  const incomplete = await request();
  assert.match(incomplete, /"type":"error"/);
  assert.doesNotMatch(incomplete, /"type":"done"/);
});
