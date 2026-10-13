import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import express from 'express';
import {registerNotificationRoutes,encodeNotificationCursor} from '../backend/notifications.ts';
const calls=[];
let rpcError=false;
const row={id:'11111111-1111-4111-8111-111111111111',kind:'story_comment',storyId:'story-1',commentId:'comment-1',replyRootId:null,milestone:null,createdAt:'2026-10-13T00:00:00.123456+00:00',readAt:null};
const app=express();app.use(express.json());
registerNotificationRoutes(app,{
 authenticate:async req=>{if(req.headers.authorization!=='Bearer valid') throw new Error('AUTH_REQUIRED');},
 scopedClient:req=>({rpc:async(name,args)=>{
  calls.push({name,args,authorization:req.headers.authorization});
  if(rpcError)return {data:null,error:{message:'unavailable'}};
  return {data:name==='read_my_notifications'?[row,{...row,id:'22222222-2222-4222-8222-222222222222'}]:name==='count_my_unread_notifications'?2:null,error:null};
 }}),
 sendError:(res,e)=>res.status(e.message==='AUTH_REQUIRED'?401:500).json({error:e.message}),
});
let server,url;const prior=process.env.NOTIFICATIONS_REPLIES_ENABLED;
before(async()=>{process.env.NOTIFICATIONS_REPLIES_ENABLED='true';server=app.listen(0,'127.0.0.1');await once(server,'listening');url=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{await new Promise(r=>server.close(r));if(prior===undefined)delete process.env.NOTIFICATIONS_REPLIES_ENABLED;else process.env.NOTIFICATIONS_REPLIES_ENABLED=prior;});
const request=(path,options={})=>fetch(url+path,{headers:{Authorization:'Bearer valid','Content-Type':'application/json'},...options});

test('anonymous notification reads never reach a DB RPC',async()=>{
 calls.length=0;const res=await request('/api/notifications',{headers:{}});assert.equal(res.status,401);assert.equal(calls.length,0);
});
test('pagination forwards keyset tuple without a caller-selected user and caches nothing',async()=>{
 calls.length=0;const res=await request('/api/notifications?limit=1&userId=attacker');assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'no-store');
 const data=await res.json();assert.deepEqual(data.notifications,[row]);assert.equal(data.unreadCount,2);assert.equal(data.nextCursor,encodeNotificationCursor(row));
 assert.deepEqual(calls[0],{name:'read_my_notifications',args:{p_limit:2,p_before_created_at:null,p_before_id:null},authorization:'Bearer valid'});
 const cursor=encodeURIComponent(data.nextCursor);await request(`/api/notifications?limit=1&cursor=${cursor}`);
 assert.equal(calls[2].args.p_before_created_at,row.createdAt);assert.equal(calls[2].args.p_before_id,row.id);
});
test('malformed query fails before storage',async()=>{calls.length=0;const res=await request('/api/notifications?limit=999');assert.equal(res.status,400);assert.equal(calls.length,0);});
test('read-one and read-all only pass event selection, never recipient from body',async()=>{
 calls.length=0;let res=await request(`/api/notifications/${row.id}/read`,{method:'POST',body:JSON.stringify({recipientId:'attacker'})});assert.deepEqual(await res.json(),{updated:true});assert.deepEqual(calls[0].args,{p_id:row.id});
 res=await request('/api/notifications/read-all',{method:'POST'});assert.deepEqual(await res.json(),{updated:true});assert.deepEqual(calls[1].args,{p_id:null});
});
test('unread count is authenticated and bounded response',async()=>{const res=await request('/api/notifications/unread-count');assert.deepEqual(await res.json(),{unreadCount:2});});
test('storage failure fails closed and does not return stale successful payload',async()=>{rpcError=true;try{const res=await request('/api/notifications');assert.equal(res.status,503);assert.deepEqual(await res.json(),{error:'NOTIFICATIONS_UNAVAILABLE'});}finally{rpcError=false;}});
test('disabled draft exposes no notification route behavior',async()=>{process.env.NOTIFICATIONS_REPLIES_ENABLED='false';calls.length=0;try{const res=await request('/api/notifications');assert.equal(res.status,404);assert.equal(calls.length,0);}finally{process.env.NOTIFICATIONS_REPLIES_ENABLED='true';}});
