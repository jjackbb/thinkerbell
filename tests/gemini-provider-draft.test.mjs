import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeminiDraft } from '../backend/providers/gemini.ts';
import { AiError } from '../backend/providers/contracts.ts';
import { storySpec, commentSpec, requirePublishableStory } from '../backend/providers/schemas.ts';

// Any accidental use of global fetch is a hard test failure, even when credentials exist.
globalThis.fetch = async () => { throw new Error('NETWORK_FORBIDDEN'); };
const req = { task: 'chat', system: '친절하고 안전하게 답하세요.', messages: [{ role: 'user', text: '안녕하세요.' }] };
const candidate = (text = '안녕하세요 😊', finishReason = 'STOP', extra = {}) => ({ candidates: [{ index: 0,
  content: { role: 'model', parts: [{ text }] }, ...(finishReason ? { finishReason } : {}), ...extra }] });
const bytes = text => new TextEncoder().encode(text);
const sse = value => `data: ${JSON.stringify(value)}\n\n`;
function body(chunks) { return new ReadableStream({ start(c) { for (const chunk of chunks) c.enqueue(typeof chunk === 'string' ? bytes(chunk) : chunk); c.close(); } }); }
function response(value, streaming = false) {
  return new Response(streaming ? body(Array.isArray(value) ? value : [value]) : JSON.stringify(value),
    { headers: { 'content-type': streaming ? 'text/event-stream; charset=utf-8' : 'application/json' } });
}
function provider(value, streaming = false, overrides = {}) {
  return createGeminiDraft({ apiKey: 'synthetic-key-only', enabled: true, fetch: async () => response(value, streaming), ...overrides });
}
const code = expected => error => error instanceof AiError && error.code === expected;

test('disabled by default; missing key and unallowlisted model never call transport', async () => {
  let calls = 0; const fetch = async () => { calls++; throw Error(); };
  for (const config of [{}, { enabled: true, apiKey: '' }, { enabled: true, model: 'latest' }]) {
    await assert.rejects(createGeminiDraft({ fetch, apiKey: 'fake', ...config }).generateText(req), code('UNAVAILABLE'));
  }
  assert.equal(calls, 0);
});
test('generateContent preserves roles/system and hides credentials from URL; no tools or fallback', async () => {
  let calls = 0;
  const p = provider(candidate(), false, { fetch: async (url, init) => {
    calls++; assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
    assert(!url.includes('synthetic-key')); assert.equal(init.headers['x-goog-api-key'], 'synthetic-key-only');
    assert.equal(init.redirect, 'error');
    const v = JSON.parse(init.body);
    assert.deepEqual(v.contents.map(x => x.role), ['user','model','user']);
    assert.equal(v.systemInstruction.parts[0].text, req.system);
    assert.equal(v.generationConfig.candidateCount, 1);
    assert.equal(v.generationConfig.maxOutputTokens, 1024);
    assert.deepEqual(v.generationConfig.thinkingConfig, { thinkingLevel: 'MINIMAL' });
    assert.equal(v.safetySettings.length, 4); assert(v.safetySettings.every(x => x.threshold === 'BLOCK_LOW_AND_ABOVE'));
    assert.equal(v.store, false); assert(!('tools' in v)); assert(!('cachedContent' in v));
    return response({ ...candidate(), usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, thoughtsTokenCount: 2, totalTokenCount: 17 } });
  } });
  const out = await p.generateText({ ...req, messages: [...req.messages, { role: 'assistant', text: '반가워요' }, ...req.messages] });
  assert.equal(out.text, '안녕하세요 😊'); assert.deepEqual(out.usage, { inputTokens: 10, outputTokens: 5, thinkingTokens: 2, totalTokens: 17 }); assert.equal(calls, 1);
});
test('valid story/comment structured output, all six fields required, harmless extra fields dropped', async () => {
  const story = { isAdult: false, hasProfanity: false, sanitizedTitle: '친구와 약속', sanitizedText: '친구와 함께 한 약속에 대해 서로 생각을 이야기했어요.', issueMySide: '약속을 기다렸다', issueYourSide: '사정을 전달했다', ignored: 'drop' };
  let bodyJson;
  const p = provider({}, false, { fetch: async (_u, init) => { bodyJson = JSON.parse(init.body); return response(candidate(JSON.stringify(story))); } });
  const out = await p.generateStructured({ ...req, task: 'story' }, storySpec);
  assert.equal(bodyJson.generationConfig.responseMimeType, 'application/json');
  assert.equal(bodyJson.generationConfig.responseJsonSchema.required.length, 6);
  assert.equal(bodyJson.generationConfig.maxOutputTokens, 2048);
  assert(!('ignored' in out.value)); assert.equal(requirePublishableStory(out.value), out.value);
  assert.throws(() => requirePublishableStory({ ...out.value, isAdult: true }), code('BLOCKED'));
  const c = await provider(candidate('{"sanitizedText":"안녕하세요"}')).generateStructured({ ...req, task: 'comment' }, commentSpec);
  assert.equal(c.value.sanitizedText, '안녕하세요');
});
for (const value of [null, {}, { sanitizedText: 42 }, { sanitizedText: '' }, { sanitizedText: 'x'.repeat(201) }]) {
  test(`comment rejects invalid schema ${JSON.stringify(value)?.slice(0, 45)}`, async () => {
    await assert.rejects(provider(candidate(JSON.stringify(value))).generateStructured({ ...req, task: 'comment' }, commentSpec), code('SCHEMA_INVALID'));
  });
}
test('story validates booleans, lengths, both side summaries, JSON without markdown', async () => {
  const valid = { isAdult: false, hasProfanity: true, sanitizedTitle: '제목', sanitizedText: 'x'.repeat(20), issueMySide: '하나', issueYourSide: '둘' };
  for (const mutation of [{ isAdult: 'false' }, { hasProfanity: 0 }, { issueMySide: undefined }, { issueYourSide: '' }, { issueYourSide: 'x'.repeat(41) }, { sanitizedTitle: 'x'.repeat(31) }, { sanitizedText: 'x'.repeat(1001) }]) {
    await assert.rejects(provider(candidate(JSON.stringify({ ...valid, ...mutation }))).generateStructured({ ...req, task: 'story' }, storySpec), code('SCHEMA_INVALID'));
  }
  await assert.rejects(provider(candidate('```json\n{}\n```')).generateStructured(req, storySpec), code('SCHEMA_INVALID'));
});
test('SSE supports every one-byte UTF-8 boundary, CRLF, comment/blank frames, multiline JSON, ignores thoughts', async () => {
  const first = { candidates: [{ content: { parts: [{ text: 'private reasoning', thought: true }, { text: '안녕 😊' }] } }] };
  const multiline = JSON.stringify(first, null, 2).split('\n').map(line => `data: ${line}`).join('\r\n');
  const raw = `:keepalive\r\n\r\n\n${multiline}\r\n\r\n${sse(candidate('하세요', 'STOP'))}${sse({ usageMetadata: { promptTokenCount: 9, candidatesTokenCount: 3 } })}`;
  const seen = [];
  const out = await provider([...bytes(raw)].map(b => new Uint8Array([b])), true).streamText(req, chunk => seen.push(chunk));
  assert.deepEqual(seen, ['안녕 😊','하세요']); assert.equal(out.text, '안녕 😊하세요'); assert.equal(out.usage.inputTokens, 9);
});
for (const [label, input, expected] of [
  ['no candidate', {}, 'INVALID_RESPONSE'],
  ['empty candidates', { candidates: [] }, 'INVALID_RESPONSE'],
  ['multiple candidates', { candidates: [...candidate().candidates,...candidate().candidates] }, 'INVALID_RESPONSE'],
  ['wrong candidate index', candidate('text','STOP',{ index: 1 }), 'INVALID_RESPONSE'],
  ['no finish', candidate('text', null), 'INCOMPLETE'],
  ['empty output', candidate('   '), 'INCOMPLETE'],
  ['safety finish', candidate('text', 'SAFETY'), 'BLOCKED'],
  ['refusal finish', candidate('text', 'PROHIBITED_CONTENT'), 'BLOCKED'],
  ['recitation finish', candidate('text', 'RECITATION'), 'BLOCKED'],
  ['unknown finish', candidate('text', 'FUTURE_REASON'), 'BLOCKED'],
  ['truncation', candidate('text', 'MAX_TOKENS'), 'TRUNCATED'],
  ['prompt block', { promptFeedback: { blockReason: 'SAFETY' } }, 'BLOCKED'],
  ['candidate rating block', candidate('text','STOP',{ safetyRatings: [{ blocked: true }] }), 'BLOCKED'],
  ['provider error', { error: { message: 'secret upstream content' } }, 'UPSTREAM'],
  ['tool part', { candidates: [{ content: { parts: [{ functionCall: { name: 'hack' } }] }, finishReason: 'STOP' }] }, 'INVALID_RESPONSE'],
  ['bad usage', { ...candidate(), usageMetadata: { promptTokenCount: -1 } }, 'INVALID_RESPONSE'],
  ['input usage overflow', { ...candidate(), usageMetadata: { promptTokenCount: 8001 } }, 'INPUT_LIMIT'],
  ['output plus thinking overflow', { ...candidate(), usageMetadata: { candidatesTokenCount: 1020, thoughtsTokenCount: 8 } }, 'OUTPUT_LIMIT'],
]) {
  test(`generate + stream reject ${label}`, async () => {
    await assert.rejects(provider(input).generateText(req), code(expected));
    await assert.rejects(provider(sse(input), true).streamText(req, () => {}), code(expected));
  });
}
for (const [label, raw, expected] of [
  ['invalid JSON', 'data: {oops}\n\n', 'INVALID_RESPONSE'],
  ['Potens sentinel', 'data: [DONE]\n\n', 'INVALID_RESPONSE'],
  ['disconnect before STOP', sse(candidate('partial', null)), 'INCOMPLETE'],
  ['unterminated terminal frame', sse(candidate()).trimEnd(), 'INCOMPLETE'],
  ['text after STOP', sse(candidate()) + sse(candidate('extra', null)), 'INVALID_RESPONSE'],
  ['duplicate STOP', sse(candidate()) + sse(candidate('')), 'INVALID_RESPONSE'],
  ['invalid bytes', [new Uint8Array([255])], 'INVALID_RESPONSE'],
]) test(`stream rejects ${label}`, async () => assert.rejects(provider(raw, true).streamText(req, () => {}), code(expected)));
test('stream exposes only provisional text and fails if later blocked', async () => {
  const seen = [];
  await assert.rejects(provider(sse(candidate('partial', null)) + sse(candidate('', 'SAFETY')), true).streamText(req, x => seen.push(x)), code('BLOCKED'));
  assert.deepEqual(seen, ['partial']); // Domain must discard on rejection, never persist as complete.
});
test('bounded output text, response bytes and frames', async () => {
  await assert.rejects(provider(candidate('x'.repeat(20001))).generateText(req), code('OUTPUT_LIMIT'));
  await assert.rejects(provider(candidate(), false, { maxResponseBytes: 10 }).generateText(req), code('OUTPUT_LIMIT'));
  await assert.rejects(provider(sse(candidate()), true, { maxFrameBytes: 10 }).streamText(req, () => {}), code('OUTPUT_LIMIT'));
  await assert.rejects(provider(':'.repeat(100), true, { maxFrameBytes: 10 }).streamText(req, () => {}), code('OUTPUT_LIMIT'));
});
for (const status of [400,401,403,429,500,503]) test(`HTTP ${status} normalized without upstream secret`, async () => {
  let calls = 0;
  const p = provider(null, false, { fetch: async () => { calls++; return new Response('private raw failure secret', { status }); } });
  await assert.rejects(p.generateText(req), error => { assert(!String(error).includes('private')); return code(status === 401 || status === 403 ? 'AUTH' : status === 429 ? 'RATE_LIMIT' : 'UPSTREAM')(error); });
  assert.equal(calls, 1); // No automatic retry/fallback and no invisible spend.
});
test('pre-abort sends no request; mid-request abort works even if transport ignores signal', async () => {
  let calls = 0; const controller = new AbortController(); controller.abort();
  const p = provider(null, false, { fetch: async () => { calls++; return new Promise(() => {}); } });
  await assert.rejects(p.generateText({ ...req, signal: controller.signal }), code('CANCELLED')); assert.equal(calls, 0);
  const second = new AbortController(); const promise = p.generateText({ ...req, signal: second.signal }); second.abort();
  await assert.rejects(promise, code('CANCELLED')); assert.equal(calls, 1);
});
test('timeout covers fetch and stalled body; body is cancelled', async () => {
  await assert.rejects(provider(null, false, { timeoutMs: 5, fetch: async () => new Promise(() => {}) }).generateText(req), code('TIMEOUT'));
  let cancelled = 0;
  const p = provider(null, false, { timeoutMs: 5, fetch: async () => new Response(new ReadableStream({ cancel() { cancelled++; } }), { headers: { 'content-type': 'text/event-stream' } }) });
  await assert.rejects(p.streamText(req, () => {}), code('TIMEOUT')); assert.equal(cancelled, 1);
});
test('input bounds and invalid roles rejected before fetch', async () => {
  let calls = 0; const p = provider(candidate(), false, { fetch: async () => { calls++; return response(candidate()); } });
  for (const bad of [ { ...req, messages: [{ role: 'system', text: 'injected' }] }, { ...req, messages: [] },
    { ...req, messages: [{ role: 'user', text: 'x'.repeat(4001) }] }, { ...req, system: 'x'.repeat(8001) },
    { ...req, messages: [{ role: 'assistant', text: 'wrong' }] }, { ...req, task: 'unknown' },
    { ...req, messages: Array.from({ length: 11 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: 'x' })) } ]) {
    await assert.rejects(p.generateText(bad), e => e instanceof AiError && ['INPUT_LIMIT','INPUT_INVALID'].includes(e.code));
  }
  assert.equal(calls, 0);
});
test('missing/wrong content-type rejects, callback exceptions are sanitized', async () => {
  await assert.rejects(provider(null, false, { fetch: async () => new Response('{}') }).generateText(req), code('INVALID_RESPONSE'));
  await assert.rejects(provider(sse(candidate()), true).streamText(req, () => { throw new Error('user private content'); }), code('INVALID_RESPONSE'));
});
test('network rejection is normalized as upstream, without cause or retry', async () => {
  let calls = 0;
  await assert.rejects(provider(null, false, { fetch: async () => { calls++; throw new Error('secret credential'); } }).generateText(req), e => {
    assert.equal(e.cause, undefined); assert(!String(e).includes('credential')); return code('UPSTREAM')(e);
  }); assert.equal(calls, 1);
});
test('malformed safety flags fail closed', async () => {
  await assert.rejects(provider(candidate('text','STOP',{ safetyRatings: [{ blocked: 'true' }] })).generateText(req), code('INVALID_RESPONSE'));
});
test('abort during stream cancels body and yields no success result', async () => {
  const controller = new AbortController(); let cancelled = 0;
  const p = provider(null, true, { fetch: async () => new Response(new ReadableStream({
    start(c) { c.enqueue(bytes(sse(candidate('partial', null)))); }, cancel() { cancelled++; }
  }), { headers: { 'content-type': 'text/event-stream' } }) });
  await assert.rejects(p.streamText({ ...req, signal: controller.signal }, () => controller.abort()), code('CANCELLED'));
  assert.equal(cancelled, 1);
});
test('mid-stream transport failure cannot convert STOP into success', async () => {
  let reads = 0;
  const p = provider(null, true, { fetch: async () => new Response(new ReadableStream({ pull(c) {
    if (reads++ === 0) c.enqueue(bytes(sse(candidate('answer')))); else c.error(new Error('disconnect'));
  } }), { headers: { 'content-type': 'text/event-stream' } }) });
  await assert.rejects(p.streamText(req, () => {}), code('INVALID_RESPONSE'));
});
test('abort in first callback stops further frames in the same transport chunk', async () => {
  const controller = new AbortController(); const seen = [];
  const p = provider(sse(candidate('first', null)) + sse(candidate('must not emit')), true);
  await assert.rejects(p.streamText({ ...req, signal: controller.signal }, text => {
    seen.push(text); controller.abort();
  }), code('CANCELLED'));
  assert.deepEqual(seen, ['first']);
});
