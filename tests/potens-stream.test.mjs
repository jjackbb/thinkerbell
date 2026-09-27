import test from 'node:test';
import assert from 'node:assert/strict';
import { consumePotensStream } from '../backend/potensStream.ts';

const streamOf = (...chunks) => new ReadableStream({
  start(controller) {
    for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
    controller.close();
  },
});

test('real provider text/done event shape succeeds across chunk boundaries', async () => {
  const sent = [];
  const text = await consumePotensStream(streamOf(
    'data: {"type":"text","text":"안녕',
    '"}\n\ndata: {"type":"text","text":"하세요"}\n\n',
    'data: {"type":"done","conversation_info_id":"synthetic"}\n\n',
  ), (chunk) => sent.push(chunk));
  assert.equal(text, '안녕하세요');
  assert.deepEqual(sent, ['안녕', '하세요']);
});

test('missing completion, empty completion, malformed event, and provider error cannot look successful', async () => {
  await assert.rejects(
    consumePotensStream(streamOf('data: {"type":"text","text":"부분"}\n\n'), () => {}),
    /AI_PROVIDER_STREAM_INCOMPLETE/,
  );
  await assert.rejects(
    consumePotensStream(streamOf('data: {"type":"done"}\n\n'), () => {}),
    /AI_PROVIDER_STREAM_INCOMPLETE/,
  );
  await assert.rejects(
    consumePotensStream(streamOf('data: not-json\n\n'), () => {}),
    /AI_PROVIDER_STREAM_INVALID/,
  );
  await assert.rejects(
    consumePotensStream(streamOf('data: {"type":"error"}\n\n'), () => {}),
    /AI_PROVIDER_STREAM_FAILED/,
  );
});
