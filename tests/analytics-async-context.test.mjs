import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Execute the actual analytics sink and both event paths. Only the Supabase
// transport is synthetic; no browser, project credentials or network is used.
const bundle = await build({
  stdin: { contents: `
    export { track, trackOnce } from './frontend/src/lib/events';
    export { sendGA4Event } from './frontend/src/lib/ga4';
    export { captureGA4EventContext } from './frontend/src/lib/ga4EventContext';
    export { setAnalyticsAccountState } from './frontend/src/lib/analyticsAccountState';
    export { setAnalyticsConsent } from './frontend/src/lib/analyticsConsent';
    export { beginTask } from './frontend/src/lib/taskAnalytics';
  `, resolveDir: root },
  bundle: true, platform: 'node', format: 'esm', write: false,
  define: { 'import.meta.env': JSON.stringify({ VITE_GA4_ID: 'G-SYNTHETIC', VITE_RELEASE_ID: 'synthetic' }) },
  plugins: [{ name: 'synthetic-internal-events', setup(build) {
    build.onResolve({ filter: /^\.\/supabase$/ }, () => ({ path: 'supabase', namespace: 'synthetic' }));
    build.onLoad({ filter: /.*/, namespace: 'synthetic' }, () => ({ contents: `export const supabase = {
      auth: { getSession: async () => ({ data: { session: null } }) },
      from: name => ({ insert: async value => { globalThis.__dbEvents.push({ name, value }); return { error: null }; } })
    };` }));
  } }],
});
let moduleId = 0;
const storage = () => { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) }; };
async function runtime() {
  let script = null;
  globalThis.window = new EventTarget();
  globalThis.localStorage = storage(); globalThis.sessionStorage = storage();
  globalThis.location = { origin: 'https://example.invalid', pathname: '/', search: '' };
  const surface = { dataset: { analyticsScreen: 'ai_chat' }, getClientRects: () => [{}] };
  globalThis.document = { cookie: '', referrer: '',
    querySelector: () => script,
    querySelectorAll: selector => selector === '[data-analytics-screen]' ? [surface] : [],
    createElement: () => ({ dataset: {} }), head: { appendChild: element => { script = element; } },
  };
  globalThis.__dbEvents = [];
  const code = bundle.outputFiles[0].text + `\n// runtime ${++moduleId}`;
  const api = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  api.setAnalyticsConsent('accepted');
  return { ...api, events: () => (window.dataLayer ?? []).map(item => Array.from(item)).filter(item => item[0] === 'event'),
    db: () => globalThis.__dbEvents, close: () => { for (const name of ['window', 'document', 'location', 'localStorage', 'sessionStorage', '__dbEvents']) delete globalThis[name]; } };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
function outcomes(api, context) {
  api.trackOnce('turn1', 'ai_chat_turn1', {}, context);
  api.trackOnce('turn3', 'ai_chat_turn3', {}, context);
  api.track('operation_success', { operation: 'ai_reply_save', outcome: 'completed' }, context);
  api.track('operation_error', { operation: 'ai_reply_save', error_code: 'save_failed' }, context);
  api.track('ai_feedback_submit', { outcome: 'submitted' }, context);
  api.trackOnce('publish', 'story_publish_success', {}, context);
  api.trackOnce('vote', 'vote_submit', {}, context);
  api.track('vote_change_success', {}, context);
  api.trackOnce('comment', 'comment_create_success', {}, context);
  api.track('ai_chat_open', { mode: 'simulation' }, context);
}

test('excluded/pending-start async outcomes remain out of GA4 after logout or switching to a normal account, while DB 9-event policy is preserved', async () => {
  for (const startState of ['blocked', 'pending']) {
    for (const nextIdentity of ['anonymous', 'normal']) {
      const api = await runtime();
      try {
        api.setAnalyticsAccountState(startState);
        const context = api.captureGA4EventContext();
        api.setAnalyticsAccountState('pending'); api.setAnalyticsAccountState('allowed');
        outcomes(api, context); await flush();
        assert.deepEqual(api.events(), [], `${startState} -> ${nextIdentity}`);
        assert.deepEqual(api.db().map(row => row.value.event_name), ['ai_chat_turn1', 'ai_chat_turn3', 'vote_submit']);
      } finally { api.close(); }
    }
  }
});
test('allowed-start outcomes fail closed after any account epoch change, including same-account refresh', async () => {
  const api = await runtime();
  try {
    api.setAnalyticsAccountState('allowed'); const context = api.captureGA4EventContext();
    api.setAnalyticsAccountState('pending'); api.setAnalyticsAccountState('allowed');
    outcomes(api, context); await flush(); assert.deepEqual(api.events(), []);
    // The final GA4 boundary also protects direct callers, not only track().
    api.sendGA4Event('vote_submit', {}, context); assert.deepEqual(api.events(), []);
  } finally { api.close(); }
});
test('consent withdrawal/reacceptance never replays a prior async result', async () => {
  const api = await runtime();
  try {
    api.setAnalyticsAccountState('allowed'); const context = api.captureGA4EventContext();
    api.setAnalyticsConsent('refused'); api.setAnalyticsConsent('accepted');
    outcomes(api, context); await flush(); assert.deepEqual(api.events(), []);
    assert.equal(api.db().length, 3, 'existing internal DB completion-time consent behavior is unchanged');
  } finally { api.close(); }
});
test('an operation begun without consent is never sent after later consent', async () => {
  const api = await runtime();
  try {
    api.setAnalyticsAccountState('allowed'); api.setAnalyticsConsent('refused');
    const context = api.captureGA4EventContext(); api.setAnalyticsConsent('accepted');
    outcomes(api, context); await flush(); assert.deepEqual(api.events(), []);
  } finally { api.close(); }
});
test('same consent and account context still sends valid outcomes once with no context fields or identifiers in GA4', async () => {
  const api = await runtime();
  try {
    api.setAnalyticsAccountState('allowed'); const context = api.captureGA4EventContext();
    outcomes(api, context); await flush();
    assert.equal(api.events().length, 10); assert.equal(api.db().length, 3);
    api.trackOnce('turn1', 'ai_chat_turn1', {}, context); await flush();
    assert.equal(api.events().length, 10); assert.equal(api.db().length, 3);
    assert.doesNotMatch(JSON.stringify(api.events()), /consentRevision|accountRevision|eligible|user_id|@/);
  } finally { api.close(); }
});
test('beginTask exposes its original snapshot and does not emit its late result after an epoch change', async () => {
  const api = await runtime();
  try {
    api.setAnalyticsAccountState('blocked'); const task = api.beginTask('ai_response');
    api.setAnalyticsAccountState('allowed'); task.finish('success');
    api.track('ai_chat_turn1', {}, task.ga4Context); await flush();
    assert.deepEqual(api.events(), []); assert.equal(api.db().length, 1);
  } finally { api.close(); }
});
test('all known asynchronous direct event call sites pass their start-time context', () => {
  const ai = readFileSync(path.join(root, 'frontend/src/components/AIChatView.tsx'), 'utf8');
  const app = readFileSync(path.join(root, 'frontend/src/App.tsx'), 'utf8');
  for (const event of ['ai_chat_turn1', 'ai_chat_turn3']) assert.match(ai, new RegExp(`'${event}', analyticsProps, task\\.ga4Context`));
  assert.match(ai, /operation: 'ai_reply_save',[\s\S]*?\}, task\.ga4Context\)/);
  assert.match(ai, /error_code: 'save_failed' \}, task\.ga4Context\)/);
  assert.match(ai, /track\('ai_feedback_submit',[\s\S]*?\}, task\.ga4Context\)/);
  for (const event of ['vote_change_success', 'comment_create_success']) assert.match(app, new RegExp(`'${event}', \\{\\}, task\\.ga4Context`));
  assert.match(app, /'vote_submit', \{ storyId, option \}, task\.ga4Context/);
  assert.match(app, /const ga4Context = captureGA4EventContext\(\);\s+notifyIfCrisis\(storyData/);
  assert.match(app, /'story_publish_success', \{\}, ga4Context/);
  assert.equal((app.match(/track\('ai_chat_open',[^\n]+, ga4Context\)/g) ?? []).length, 2);
  assert.match(app, /openStoryDetail\(result\.story, 'chat_return', ga4Context\)/);
  assert.match(app, /openStoryDetail\(fresh\.data, 'my_page', ga4Context\)/);
});
