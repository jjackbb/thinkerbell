import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
const originalFetch=globalThis.fetch;
const owner='11111111-1111-4111-8111-111111111111';
const requestId='22222222-2222-4222-8222-222222222222';
const notificationId='33333333-3333-4333-8333-333333333333';
const calls=[];let providerCalls=0;let providerFails=false;
const metadata={lastCompletedAt:'2026-10-13T14:00:00Z',expiresAt:'2027-04-13T14:00:00Z',retentionVersion:2,retentionBasis:'completed_turn'};
const room={id:'persona-live',userId:owner,storyId:'story-1',createdAt:'2019-01-01T00:00:00Z',systemInstruction:'synthetic',chatHistory:[],...metadata};
Object.assign(process.env,{SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'test-anon',SUPABASE_SECRET_KEY:'test-secret',POTENS_API_KEY:'test-provider',AI_QUOTA_ACTIVATES_AT:'2020-01-01T15:00:00Z',AI_QUOTA_SERVER_READY:'true',AI_RETENTION_ENABLED:'true',NOTIFICATIONS_REPLIES_ENABLED:'true'});
globalThis.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input.url);
 if(url.hostname==='ai.potens.ai'){providerCalls++;return providerFails?new Response('failed',{status:503}):new Response('data: {"type":"text","text":"synthetic answer"}\n\ndata: {"type":"done"}\n\n',{headers:{'Content-Type':'text/event-stream'}});}
 if(url.hostname!=='example.supabase.co')return originalFetch(input,init);
 if(url.pathname==='/auth/v1/user')return Response.json({id:owner,aud:'authenticated',user_metadata:{},app_metadata:{}});
 if(url.pathname.startsWith('/rest/v1/rpc/')){
  const name=url.pathname.split('/').at(-1),args=JSON.parse(init.body||'{}');calls.push({name,args});
  if(name==='read_ai_room_for_user'){
   if(args.p_persona_id==='persona-expired')return Response.json({message:'AI_ROOM_EXPIRED',code:'P0001'},{status:400});
   if(args.p_persona_id==='persona-other')return Response.json({message:'CHAT_ROOM_NOT_FOUND',code:'P0001'},{status:400});
   return Response.json({...room,id:args.p_persona_id,chatHistory:args.p_persona_id==='persona-replay'?[{sender:'ai',requestId,text:'prior answer'}]:[]});
  }
  if(name==='read_my_ai_notification_target')return Response.json(args.p_id===notificationId?room:null);
  if(name==='complete_ai_turn')return Response.json({result:'saved',charged:false,retention:metadata});
  throw new Error(`Unexpected RPC ${name}`);
 }
 throw new Error(`Unexpected mock request ${url.pathname}`);
};
const {default:app}=await import('../backend/app.ts');let server,url;
before(async()=>{server=app.listen(0,'127.0.0.1');await once(server,'listening');url=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{await new Promise(r=>server.close(r));globalThis.fetch=originalFetch;});
const get=(path,auth=true)=>fetch(url+path,{headers:auth?{Authorization:'Bearer valid'}:{}});
const chat=body=>fetch(url+'/api/chat-stream',{method:'POST',headers:{Authorization:'Bearer valid','Content-Type':'application/json'},body:JSON.stringify({personaId:'persona-live',prompt:'hello',requestId,...body})});
test('owner room read requires auth, uses verified server actor, and caches nothing',async()=>{
 assert.equal((await get('/api/ai/rooms/persona-live',false)).status,401);calls.length=0;
 const res=await get('/api/ai/rooms/persona-live');assert.equal(res.status,200);assert.equal(res.headers.get('Cache-Control'),'no-store');assert.deepEqual(calls[0].args,{p_user_id:owner,p_persona_id:'persona-live',p_request_id:null});assert.equal((await res.json()).room.expiresAt,metadata.expiresAt);
});
test('expired/other-owner room reads fail closed',async()=>{
 assert.equal((await get('/api/ai/rooms/persona-expired')).status,410);assert.equal((await get('/api/ai/rooms/persona-other')).status,404);
});
test('warning target is resolved by own-event RPC without accepting browser room/recipient',async()=>{
 calls.length=0;const res=await get(`/api/notifications/${notificationId}/target?roomId=other&userId=other`);assert.equal(res.status,200);assert.deepEqual(calls[0],{name:'read_my_ai_notification_target',args:{p_id:notificationId}});
 assert.equal((await get('/api/notifications/44444444-4444-4444-8444-444444444444/target')).status,404);
});
test('expired new turn is refused before provider call',async()=>{
 const count=providerCalls;assert.equal((await chat({personaId:'persona-expired'})).status,410);assert.equal(providerCalls,count);
});
test('persisted completion SSE carries authoritative metadata, no browser expiry passed',async()=>{
 calls.length=0;const res=await chat({expiresAt:'2099-01-01',lastCompletedAt:'2098-01-01'});const text=await res.text();assert.match(text,/"persisted":true/);assert.ok(text.includes(metadata.expiresAt));const complete=calls.find(c=>c.name==='complete_ai_turn');assert.ok(complete);assert.equal('expiresAt' in complete.args,false);assert.equal(complete.args.p_user_id,owner);assert.ok(!complete.args.p_finished_at.startsWith('2098'));
});

test('lost-response replay does not call provider or completion again',async()=>{
 const before=providerCalls;calls.length=0;const res=await chat({personaId:'persona-replay'});const text=await res.text();assert.match(text,/"recovered":true/);assert.equal(providerCalls,before);assert.equal(calls.some(c=>c.name==='complete_ai_turn'),false);
});
test('failed provider does not write completion or renew expiry',async()=>{
 providerFails=true;calls.length=0;try{const res=await chat({});assert.match(await res.text(),/ai_provider_failed/);assert.equal(calls.some(c=>c.name==='complete_ai_turn'),false);}finally{providerFails=false;}
});
test('AI retention flag off removes new room/target routes',async()=>{
 process.env.AI_RETENTION_ENABLED='false';try{assert.equal((await get('/api/ai/rooms/persona-live')).status,404);assert.equal((await get(`/api/notifications/${notificationId}/target`)).status,404);}finally{process.env.AI_RETENTION_ENABLED='true';}
});
