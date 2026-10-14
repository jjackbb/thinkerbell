import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { emptyVoteProjection, projectStoryVote, confirmStoryVote, isCurrentVoteRead, releaseVoteRequest, advanceVoteAccount } from '../frontend/src/lib/voteProjection.ts';
const story = { id: 'story', authorId: 'author', votesA: 0, votesB: 1, commentCount: 0 };
const projection = { accountId: 'voter-b', epoch: 3, rows: [{ storyId: 'story', option: 'B', changeCount: 0 }] };

test('reconnect replacement retains own vote while taking fresh public totals', () => {
  const loaded = projectStoryVote(story, projection, 'voter-b', 3);
  assert.equal(loaded.userVoted, 'B');
  const reconnected = projectStoryVote({ ...story, votesA: 4, votesB: 7 }, projection, 'voter-b', 3);
  assert.equal(reconnected.userVoted, 'B');
  assert.equal(reconnected.votesA, 4);
  assert.equal(reconnected.votesB, 7);
  assert.equal(reconnected.voteChanged, false);
});
test('comment invalidation and separately fetched detail hydrate the same vote', () => {
  const updated = { ...story, commentCount: 2 };
  assert.equal(updated.userVoted, undefined);
  const feed = projectStoryVote(updated, projection, 'voter-b', 3);
  const detail = projectStoryVote({ ...updated }, projection, 'voter-b', 3);
  assert.equal(feed.userVoted, 'B');
  assert.equal(detail.userVoted, feed.userVoted);
  assert.equal(detail.commentCount, 2);
});
test('changed vote survives all replacements and retains one-change limit', () => {
  const next = confirmStoryVote(projection, 'voter-b', 3, { storyId: 'story', option: 'A', changeCount: 1 });
  assert.equal(next.rows.length, 1);
  const refreshed = projectStoryVote(story, next, 'voter-b', 3);
  assert.equal(refreshed.userVoted, 'A');
  assert.equal(refreshed.voteChanged, true);
});
test('guest, other account and new auth epoch never inherit a previous vote', () => {
  const contaminated = { ...story, userVoted: 'B', voteChanged: true };
  for (const [account, epoch] of [[null, 3], ['other', 3], ['voter-b', 4]]) {
    const visible = projectStoryVote(contaminated, projection, account, epoch);
    assert.equal(visible.userVoted, undefined);
    assert.equal(visible.voteChanged, false);
  }
});
test('authoritative no-vote result clears old projected fields', () => {
  const empty = { accountId: 'voter-b', epoch: 3, rows: [] };
  const visible = projectStoryVote({ ...story, userVoted: 'B', voteChanged: true }, empty, 'voter-b', 3);
  assert.equal(visible.userVoted, undefined);
  assert.equal(visible.voteChanged, false);
});
test('late A response after A → B → A is stale despite matching account id', () => {
  const ticket = { accountId: 'voter-b', epoch: 3, request: 1 };
  assert.equal(isCurrentVoteRead(ticket, 'voter-b', 5, 1), false);
  assert.equal(isCurrentVoteRead(ticket, null, 4, 1), false);
  assert.equal(isCurrentVoteRead(ticket, 'other', 4, 1), false);
  assert.equal(isCurrentVoteRead(ticket, 'voter-b', 3, 1), true);
});
test('older parallel read and pre-mutation reads cannot overwrite newer confirmations', () => {
  const pending = { accountId: 'voter-b', epoch: 3, request: 1 };
  assert.equal(isCurrentVoteRead(pending, 'voter-b', 3, 2), false);
  assert.equal(isCurrentVoteRead({ ...pending, request: 2 }, 'voter-b', 3, 2), true);
  assert.equal(isCurrentVoteRead({ accountId: null, epoch: 3, request: 2 }, null, 3, 2), false);
});
test('confirmation on a new account drops old account rows and does not mutate source', () => {
  const confirmed = confirmStoryVote(projection, 'other', 4, { storyId: 'new-story', option: 'A', changeCount: 0 });
  assert.deepEqual(confirmed.rows.map(vote => vote.storyId), ['new-story']);
  assert.equal(projection.rows[0].option, 'B');
  assert.equal(emptyVoteProjection().rows.length, 0);
});
test('public projection preserves blind/private flags and stable object when already hydrated', () => {
  const publicStory = { ...story, visibility: 'private', isBlind: true };
  const visible = projectStoryVote(publicStory, projection, 'voter-b', 3);
  assert.equal(visible.isBlind, true);
  assert.equal(visible.visibility, 'private');
  assert.equal(projectStoryVote(visible, projection, 'voter-b', 3), visible);
});
test('App derives feed and detail from private projection and guards both async write outcomes', () => {
  const app = readFileSync(new URL('../frontend/src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /\[publicStories, setStories\]/);
  assert.match(app, /projectStoryVote\(story, voteProjection, authUserId, voteAccountContext.current.epoch\)/);
  assert.match(app, /projectStoryVote\(selectedPublicStory, voteProjection, authUserId, voteAccountContext.current.epoch\)/);
  assert.match(app, /isCurrentVoteRead\(ticket, authUserIdRef.current, voteAccountContext.current.epoch, voteReadRequest.current\)/);
  const handler = app.slice(app.indexOf('  const handleVote ='), app.indexOf('  const handleVote =') + 5000);
  assert.match(handler, /voteReadRequest.current\+\+;[\s\S]*confirmStoryVote/);
  assert.ok(handler.split('if (!currentVoteAccount())').length >= 4);
  assert.match(handler, /releaseVoteRequest\(pendingVoteIds.current, storyId, pendingVoteRequest\)/);
});

test('same-account auth epoch change releases its busy marker when stale RPC finishes', () => {
  const request = Symbol('old request');
  const pending = new Map([['story', request]]);
  releaseVoteRequest(pending, 'story', request);
  assert.equal(pending.has('story'), false);
});
test('old account RPC cannot release a newer vote request after account switch', () => {
  const oldRequest = Symbol('old');
  const newRequest = Symbol('new');
  const pending = new Map([['story', oldRequest]]);
  pending.clear();
  pending.set('story', newRequest);
  releaseVoteRequest(pending, 'story', oldRequest);
  assert.equal(pending.get('story'), newRequest);
  releaseVoteRequest(pending, 'story', newRequest);
  assert.equal(pending.size, 0);
});

test('repeated same-account auth does not invalidate a pending confirmed write', () => {
  const loggedIn = { accountId: 'voter-b', epoch: 3 };
  assert.equal(advanceVoteAccount(loggedIn, 'voter-b'), loggedIn);
  const loggedOut = advanceVoteAccount(loggedIn, null);
  const returned = advanceVoteAccount(loggedOut, 'voter-b');
  assert.equal(returned.epoch, 5);
  assert.equal(isCurrentVoteRead({ ...loggedIn, request: 1 }, returned.accountId, returned.epoch, 1), false);
});
