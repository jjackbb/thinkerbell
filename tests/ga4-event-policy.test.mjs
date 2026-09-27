import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldSendToGA4 } from '../frontend/src/lib/ga4EventPolicy.ts';

test('core task actions and actual AI save outcomes are eligible', () => {
  for (const name of [
    'story_view', 'story_publish_success', 'vote_submit',
    'comment_create_success', 'ai_entry_click', 'ai_chat_turn1',
    'ai_feedback_submit',
  ]) {
    assert.equal(shouldSendToGA4(name, {}), true, name);
  }
  assert.equal(shouldSendToGA4('operation_success', { operation: 'ai_reply_save' }), true);
  assert.equal(shouldSendToGA4('operation_error', { operation: 'ai_reply_save' }), true);
});

test('authentication and unrelated operations stay out of GA4', () => {
  assert.equal(shouldSendToGA4('app_open', {}), false);
  assert.equal(shouldSendToGA4('login_success', {}), false);
  assert.equal(shouldSendToGA4('operation_success', { operation: 'account_delete' }), false);
  assert.equal(shouldSendToGA4('operation_error', {}), false);
});
