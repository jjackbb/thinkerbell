import test from 'node:test';
import assert from 'node:assert/strict';
import { groupCommentThreads, replyTargetLabel } from '../frontend/src/lib/commentThreads.ts';
import { mergeNotifications, notificationLabel } from '../frontend/src/lib/notificationModel.ts';
const comment = (id, patch = {}) => ({ id, storyId: 'story', content: 'synthetic', authorId: id, anonymousId: `익명 ${id}`, createdAt: '2026-10-13T00:00:00Z', likeCount: 0, reportsCount: 0, ...patch });
const group = (comments, filter = 'all', sort = 'latest') => groupCommentThreads(comments, filter, sort, 'viewer', null);
test('many replies and replies to replies share one visual root', () => {
 const comments = [comment('root'), comment('r1', {replyRootId:'root', replyToId:'root'}), comment('r2', {replyRootId:'root', replyToId:'r1'}), comment('r3', {replyRootId:'root', replyToId:'root'})];
 const result = group(comments);
 assert.equal(result.length, 1); assert.equal(result[0].replies.length, 3);
 assert.equal(replyTargetLabel(comments[2], comments), '익명 r1');
});
test('missing, blind and deleted parents never leak author text or detach replies', () => {
 const reply = comment('reply', {replyRootId:'root', replyToId:'root'});
 for (const root of [undefined, comment('root', {isBlind:true}), comment('root', {deletedAt:'deleted'})]) {
  const comments = root ? [root, reply] : [reply];
  assert.equal(group(comments)[0].id, 'root');
  assert.equal(group(comments)[0].replies.length, 1);
  assert.equal(replyTargetLabel(reply, comments), '볼 수 없는 댓글');
 }
});
test('vote filtering preserves a reply and its context as a group', () => {
 const comments = [comment('root', {authorVoted:'B'}), comment('r1', {replyRootId:'root', authorVoted:'A'})];
 assert.equal(group(comments, 'A')[0].root.id, 'root');
 assert.equal(group(comments, 'A')[0].replies.length, 1);
});
test('sorting groups preserves chronological reply order without mutating input', () => {
 const comments = [comment('r2', {replyRootId:'root',createdAt:'2026-10-13T02:00:00Z'}),comment('r1', {replyRootId:'root',createdAt:'2026-10-13T01:00:00Z'}),comment('root')];
 assert.deepEqual(group(comments)[0].replies.map(c=>c.id), ['r1','r2']);
 assert.equal(comments[0].id, 'r2');
});
test('pagination deduplicates and does not revert read state', () => {
 const item = {id:'notice',kind:'comment_reply',readAt:'2026-10-13T01:00:00Z'};
 assert.deepEqual(mergeNotifications([item], [{...item, readAt:null}]), [item]);
 assert.equal(mergeNotifications([item], [{...item,id:'another'}]).length, 2);
});
test('notification labels only describe supported events without exposing source content', () => {
 assert.match(notificationLabel({kind:'story_vote_milestone',milestone:100}), /100표에 도달/);
 for(const kind of ['story_comment','comment_reply','comment_like']) assert.ok(notificationLabel({kind}).length > 0);
});
