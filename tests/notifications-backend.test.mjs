import test from 'node:test';
import assert from 'node:assert/strict';
import {readReplyTarget, sameCommentRequest, projectComment, readNotificationPage, encodeNotificationCursor, notificationsRepliesEnabled} from '../backend/notifications.ts';
const id='comment-11111111-1111-4111-8111-111111111111';

test('reply targets reject browser-controlled ownership, recipient, and grouping',()=>{
 assert.equal(readReplyTarget({}),null);
 assert.equal(readReplyTarget({replyToId:id}),id);
 assert.equal(readReplyTarget({replyToId:'comment-legacy-1'}),'comment-legacy-1');
 for(const input of [{replyToId:''},{replyToId:[]},{replyToId:'x'.repeat(101)},{replyRootId:id},{recipientId:'x'},{recipient_id:'x'},{authorId:'x'},{deletedAt:null}]) {
  assert.throws(()=>readReplyTarget(input),/INVALID_COMMENT_TARGET/);
 }
});
test('idempotent comment recovery requires same actor, story, direct parent, live comment',()=>{
 const row={authorId:'a',storyId:'s',replyToId:id};
 assert.equal(sameCommentRequest(row,'a','s',id),true);
 for(const [user,story,parent] of [['b','s',id],['a','x',id],['a','s',null]]) assert.equal(sameCommentRequest(row,user,story,parent),false);
 assert.equal(sameCommentRequest({...row,deletedAt:'now'},'a','s',id),false);
 assert.equal(sameCommentRequest({authorId:'a',storyId:'s'},'a','s',null),true);
});
test('comment projection excludes private columns and scrubs tombstone content',()=>{
 const row={id,content:'secret',likeCount:2,reportsCount:9,appealText:'private',deletedAt:'now'};
 const result=projectComment(row);
 assert.equal(result.content,''); assert.equal(result.likeCount,0);
 assert.equal('reportsCount' in result,false); assert.equal('appealText' in result,false);
 assert.equal(result.replyToId,null);
});
test('bounded notification pagination roundtrips full timestamp precision',()=>{
 const cursor={createdAt:'2026-10-13T00:00:00.123456+00:00',id:'11111111-1111-4111-8111-111111111111'};
 assert.deepEqual(readNotificationPage({limit:'50',cursor:encodeNotificationCursor(cursor)}),{limit:50,cursor});
 assert.deepEqual(readNotificationPage({}),{limit:20,cursor:null});
 for(const limit of ['0','51','-1','1.5','1e1',[],1]) assert.throws(()=>readNotificationPage({limit}));
 for(const cursor of ['',[], '%%%','e30',Buffer.from(JSON.stringify({createdAt:'invalid',id:'x'})).toString('base64url')]) assert.throws(()=>readNotificationPage({cursor}));
});
test('draft feature is disabled unless explicitly true',()=>{
 const prior=process.env.NOTIFICATIONS_REPLIES_ENABLED;
 try {
  delete process.env.NOTIFICATIONS_REPLIES_ENABLED; assert.equal(notificationsRepliesEnabled(),false);
  process.env.NOTIFICATIONS_REPLIES_ENABLED='1'; assert.equal(notificationsRepliesEnabled(),false);
  process.env.NOTIFICATIONS_REPLIES_ENABLED='true'; assert.equal(notificationsRepliesEnabled(),true);
 } finally {if(prior===undefined) delete process.env.NOTIFICATIONS_REPLIES_ENABLED; else process.env.NOTIFICATIONS_REPLIES_ENABLED=prior;}
});
