import assert from 'node:assert/strict';
import test from 'node:test';
import { messagesBeforeRetry } from '../frontend/src/lib/chatRetry.ts';

const bubble = (sender, text) => ({ id: `${sender}-${text}`, sender, text, timestamp: '00:00' });
const prior = [bubble('user', 'earlier'), bubble('ai', 'saved reply')];

test('failed save keeps earlier history and removes the unsaved answer before new request', () => {
  const current = [...prior, bubble('user', 'retry me'), bubble('ai', 'unsaved reply')];
  assert.deepEqual(messagesBeforeRetry(current, 'retry me'), prior);
  assert.equal(messagesBeforeRetry(current, 'different input'), current);
});

test('server save failure removes the unsaved answer and warning, preserving older turns', () => {
  const current = [...prior, bubble('user', 'retry me'), bubble('ai', 'unsaved reply'), bubble('system', 'save failed')];
  assert.deepEqual(messagesBeforeRetry(current, 'retry me'), prior);
});

test('provider failure removes its input and warning before new request', () => {
  const current = [...prior, bubble('user', 'retry me'), bubble('system', 'provider failed')];
  assert.deepEqual(messagesBeforeRetry(current, 'retry me'), prior);
});
