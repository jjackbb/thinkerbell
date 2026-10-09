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

test('legacy internal-only and unknown sensitive operations stay out of GA4', () => {
  assert.equal(shouldSendToGA4('app_open', {}), false);
  assert.equal(shouldSendToGA4('login_success', {}), false);
  assert.equal(shouldSendToGA4('operation_success', { operation: 'account_delete' }), false);
  assert.equal(shouldSendToGA4('operation_error', {}), false);
});

// Privacy boundary: arbitrary URL, account and content values must not become dimensions.
import { recruitmentSource, safeEventProps } from '../frontend/src/lib/analyticsContext.ts';

test('only fixed attribution values survive; sensitive and spoofed fields are dropped', () => {
  const safe = safeEventProps('ai_chat_turn1', {
    entry_point: 'chat_list', conversation_type: 'continuation', mode: 'simulation',
    release_id: 'visitor-controlled', recruitment_source: 'private account',
    screen: 'private story', email: 'fixture@example.invalid', storyId: 'private-id',
    body: 'private content', score: 5, error_code: 'raw error with token',
  });
  assert.deepEqual(safe, {
    event_schema_version: 4, screen: 'ai_chat', entry_point: 'chat_list',
    conversation_type: 'continuation', mode: 'simulation',
  });
  assert.deepEqual(safeEventProps('story_view', { entry_point: 'https://private.invalid/?token=secret' }), {
    event_schema_version: 4, screen: 'story_detail',
  });
});

test('unlabelled or arbitrary source does not invent a recruitment channel', () => {
  assert.equal(recruitmentSource('community'), 'community');
  assert.equal(recruitmentSource('sns'), 'sns');
  assert.equal(recruitmentSource('qa'), 'technical_test');
  for (const input of [null, undefined, '', 'direct', 'fixture@example.invalid', '<script>']) {
    assert.equal(recruitmentSource(input), 'unattributed');
  }
});


test('general surfaces and fixed controls are eligible while sensitive controls fail closed', () => {
  assert.equal(shouldSendToGA4('page_view', { screen: 'login' }), true);
  assert.equal(shouldSendToGA4('page_view', { screen: 'landing' }), true);
  assert.equal(shouldSendToGA4('ui_click', { screen: 'landing', button_id: 'landing-demo-button-01' }), true);
  assert.equal(shouldSendToGA4('ui_click', { screen: 'landing', button_id: 'landing-consent-button-01' }), false);
  assert.equal(shouldSendToGA4('page_view', { screen: 'excluded' }), false);
  assert.equal(shouldSendToGA4('ui_click', { screen: 'feed', button_id: 'navbar-button-01' }), true);
  for (const id of ['story-card-button-05', 'my-page-view-button-10', 'ai-chat-view-button-20', 'analytics-consent-button-03', 'unknown-control', 'constructor', 'toString', '__proto__']) {
    assert.equal(shouldSendToGA4('ui_click', { screen: 'feed', button_id: id }), false, id);
  }
  assert.equal(shouldSendToGA4('operation_success', { operation: 'login' }), true);
  assert.equal(shouldSendToGA4('operation_error', { operation: 'nickname_update' }), true);
  assert.equal(shouldSendToGA4('operation_start', { operation: 'report' }), false);
});

test('expanded properties retain only catalog IDs and fixed outcomes', () => {
  assert.deepEqual(safeEventProps('ui_click', {
    screen: 'feed', button_id: 'navbar-button-01', element_type: 'private user text',
    text: 'private story', href: 'https://example.invalid/?token=secret', email: 'private@example.invalid',
  }), { event_schema_version: 4, screen: 'feed', button_id: 'navbar-button-01', element_type: 'button' });
  const result = safeEventProps('operation_error', { screen: 'login', operation: 'login', error_code: 'password=secret', reason: 'private raw error' });
  assert.deepEqual(result, { event_schema_version: 4, screen: 'login', operation: 'login' });
});
