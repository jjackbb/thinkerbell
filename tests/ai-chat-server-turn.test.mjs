import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

const originalFetch = globalThis.fetch;
const owner = '11111111-1111-4111-8111-111111111111';
const author = '22222222-2222-4222-8222-222222222222';
const activation = '2020-01-01T15:00:00Z';
const rooms = new Map(['one', 'partial', 'save-fail', 'old'].map((name) => [
  `persona-${name}`, {
    id: `persona-${name}`, userId: owner, storyId: 'foreign-story',
    createdAt: name === 'old' ? '2019-12-31T00:00:00Z' : '2026-09-28T00:00:00Z',
    systemInstruction: '합성 시험용 지시문', chatHistory: [],
  },
]));
const reservations = new Map();
const completed = new Set();
const feedback = new Map();
let providerCalls = 0;
let providerStream = 'data: {"type":"text","text":"저장된 답변"}\n\ndata: {"type":"done"}\n\n';
let failSave = false;

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SECRET_KEY = 'test-secret-key';
process.env.POTENS_API_KEY = 'test-potens-key';
process.env.AI_QUOTA_ACTIVATES_AT = activation;

globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  const method = init?.method ?? 'GET';
  const headers = new Headers(init?.headers);
  if (url.hostname === 'ai.potens.ai') {
    providerCalls += 1;
    return new Response(providerStream, { headers: { 'Content-Type': 'text/event-stream' } });
  }
  if (url.hostname !== 'example.supabase.co') return originalFetch(input, init);
  if (url.pathname === '/auth/v1/user') {
    return Response.json({ id: owner, aud: 'authenticated', user_metadata: {}, app_metadata: {} });
  }
  if (url.pathname === '/rest/v1/ai_personas' && method === 'GET') {
    const id = url.searchParams.get('id')?.slice(3);
    return Response.json(id && rooms.has(id)
      ? [{ opening: id === 'persona-old' ? null : 'apology', ratio: null, ...rooms.get(id) }] : []);
  }
  if (url.pathname === '/rest/v1/ai_feedback' && method === 'POST') {
    const row = JSON.parse(init.body);
    if (feedback.has(row.episode_id)) {
      return Response.json({ code: '23505', message: 'duplicate key' }, { status: 409 });
    }
    feedback.set(row.episode_id, row);
    return new Response(null, { status: 201 });
  }
  if (url.pathname === '/rest/v1/ai_feedback' && method === 'GET') {
    const id = url.searchParams.get('episode_id')?.slice(3);
    return Response.json(id && feedback.has(id) ? [feedback.get(id)] : []);
  }
  if (url.pathname === '/rest/v1/stories' && method === 'GET') {
    return Response.json([{ id: 'foreign-story', authorId: author }]);
  }
  if (url.pathname === '/rest/v1/ai_quota_completed_rooms' && method === 'GET') {
    const id = url.searchParams.get('persona_id')?.slice(3);
    return Response.json(id && completed.has(id) ? [{ persona_id: id }] : []);
  }
  if (url.pathname.startsWith('/rest/v1/rpc/') && method === 'POST') {
    const name = url.pathname.split('/').at(-1);
    const args = JSON.parse(init.body);
    const request = args.p_request_id;
    if (name === 'reserve_ai_first_reply') {
      const prior = reservations.get(request);
      if (prior?.status === 'reserved') return Response.json([{ result: 'already_reserved', occupied_count: 1 }]);
      reservations.set(request, { status: 'reserved', personaId: args.p_persona_id });
      return Response.json([{ result: 'reserved', occupied_count: 1 }]);
    }
    if (name === 'complete_ai_turn') {
      if (failSave) return Response.json({ code: 'P0001', message: 'synthetic save failure' }, { status: 400 });
      const room = rooms.get(args.p_persona_id);
      room.chatHistory.push(
        { sender: 'user', text: args.p_prompt, requestId: request },
        { sender: 'ai', text: args.p_answer, requestId: request },
      );
      completed.add(args.p_persona_id);
      if (reservations.has(request)) reservations.get(request).status = 'completed';
      return Response.json({ result: 'saved', charged: true });
    }
    if (name === 'finish_ai_first_reply') {
      if (reservations.has(request)) reservations.get(request).status = 'returned';
      return Response.json('returned');
    }
  }
  return Response.json({ code: 'TEST_UNEXPECTED_ROUTE', message: url.pathname }, { status: 500 });
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
  delete process.env.AI_QUOTA_ACTIVATES_AT;
  delete process.env.AI_QUOTA_SERVER_READY;
});

async function turn(roomName, requestId) {
  const response = await originalFetch(`${baseUrl}/api/chat-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-owner' },
    body: JSON.stringify({ personaId: `persona-${roomName}`, prompt: '합성 요청', requestId }),
  });
  return { status: response.status, text: await response.text() };
}

test('server mode is closed before database migration readiness is declared', async () => {
  const prior = providerCalls;
  const response = await turn('one', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  assert.equal(response.status, 503);
  assert.match(response.text, /AI_QUOTA_NOT_READY/);
  assert.equal(providerCalls, prior);
});

test('first reply reserves, streams, persists, and completes once; same request replays saved answer', async () => {
  process.env.AI_QUOTA_SERVER_READY = 'true';
  const requestId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const first = await turn('one', requestId);
  assert.equal(first.status, 200, first.text);
  assert.match(first.text, /"type":"provider_done"/);
  assert.match(first.text, /"type":"done","persisted":true/);
  assert.equal(rooms.get('persona-one').chatHistory.length, 2);
  assert.equal(reservations.get(requestId).status, 'completed');
  assert.equal(providerCalls, 1);

  const replay = await turn('one', requestId);
  assert.equal(replay.status, 200);
  assert.match(replay.text, /"recovered":true/);
  assert.equal(rooms.get('persona-one').chatHistory.length, 2);
  assert.equal(providerCalls, 1);
});

test('missing provider done returns the reserved slot without persisting a partial reply', async () => {
  providerStream = 'data: {"type":"text","text":"부분"}\n\n';
  const requestId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const response = await turn('partial', requestId);
  assert.equal(response.status, 200, response.text);
  assert.match(response.text, /"error":"ai_provider_failed"/);
  assert.doesNotMatch(response.text, /"type":"done"/);
  assert.equal(rooms.get('persona-partial').chatHistory.length, 0);
  assert.equal(reservations.get(requestId).status, 'returned');
  providerStream = 'data: {"type":"text","text":"저장된 답변"}\n\ndata: {"type":"done"}\n\n';
});

test('database save failure keeps provider completion separate and returns the slot', async () => {
  failSave = true;
  const requestId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const response = await turn('save-fail', requestId);
  assert.equal(response.status, 200, response.text);
  assert.match(response.text, /"type":"provider_done"/);
  assert.match(response.text, /"error":"ai_save_failed"/);
  assert.doesNotMatch(response.text, /"type":"done"/);
  assert.equal(rooms.get('persona-save-fail').chatHistory.length, 0);
  assert.equal(reservations.get(requestId).status, 'returned');
  failSave = false;
});

test('a pre-activation room continues without a new reservation', async () => {
  const requestId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const response = await turn('old', requestId);
  assert.equal(response.status, 200, response.text);
  assert.match(response.text, /"persisted":true/);
  assert.equal(reservations.has(requestId), false);
});

test('a configured future cutover keeps legacy charging but saves the reply on the server', async () => {
  process.env.AI_QUOTA_ACTIVATES_AT = '2030-01-01T15:00:00Z';
  const requestId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const response = await turn('old', requestId);
  assert.equal(response.status, 200, response.text);
  assert.match(response.text, /"persisted":true/);
  assert.equal(reservations.has(requestId), false);
  process.env.AI_QUOTA_ACTIVATES_AT = activation;
});

test('feedback requires a saved normal answer and stores score without conversation text', async () => {
  const postFeedback = async (personaId, episodeId, score) => {
    const response = await originalFetch(`${baseUrl}/api/ai/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-owner' },
      body: JSON.stringify({ personaId, episodeId, score }),
    });
    return { status: response.status, body: await response.json() };
  };
  const episode = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const before = await postFeedback('persona-partial', episode, 5);
  assert.equal(before.status, 409);
  assert.equal(before.body.error, 'AI_FEEDBACK_NOT_READY');

  const first = await postFeedback('persona-one', episode, 5);
  assert.equal(first.status, 201);
  assert.equal(first.body.saved, true);
  const invented = await postFeedback('persona-one', '99999999-9999-4999-8999-999999999999', 5);
  assert.equal(invented.status, 409);
  assert.equal(invented.body.error, 'AI_FEEDBACK_NOT_READY');
  assert.equal(feedback.get(episode).score, 5);
  assert.equal(Object.hasOwn(feedback.get(episode), 'chatHistory'), false);
  assert.equal(Object.hasOwn(feedback.get(episode), 'text'), false);

  const replay = await postFeedback('persona-one', episode, 5);
  assert.equal(replay.status, 200);
  assert.equal(replay.body.recovered, true);
  const changed = await postFeedback('persona-one', episode, 1);
  assert.equal(changed.status, 409);
  assert.equal(changed.body.error, 'AI_FEEDBACK_CONFLICT');

  const skip = await postFeedback('persona-old', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', null);
  assert.equal(skip.status, 201);
  assert.equal(feedback.get('dddddddd-dddd-4ddd-8ddd-dddddddddddd').outcome, 'skipped');
  assert.equal(feedback.get('dddddddd-dddd-4ddd-8ddd-dddddddddddd').mode, 'legacy');
});
