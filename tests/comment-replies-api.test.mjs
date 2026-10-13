import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
const originalFetch=globalThis.fetch;
const owner='11111111-1111-4111-8111-111111111111';
const id='comment-11111111-1111-4111-8111-111111111111';
const rows=new Map();const calls=[];let providerCalls=0;let rpcError=null;
Object.assign(process.env,{SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'test-anon',SUPABASE_SECRET_KEY:'test-secret',POTENS_API_KEY:'test-provider',NOTIFICATIONS_REPLIES_ENABLED:'true'});
globalThis.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input.url);
 if(url.hostname==='ai.potens.ai'){providerCalls++;return Response.json({message:'검사한 댓글'});}
 if(url.hostname!=='example.supabase.co')return originalFetch(input,init);
 if(url.pathname==='/auth/v1/user')return Response.json({id:owner,aud:'authenticated',user_metadata:{},app_metadata:{}});
 if(url.pathname==='/rest/v1/stories')return Response.json([{id:'story-1',visibility:'public'}]);
 if(url.pathname==='/rest/v1/comments'){
  const existing=rows.get(url.searchParams.get('id')?.replace('eq.',''));
  return Response.json(existing?[existing]:[]);
 }
 if(url.pathname.startsWith('/rest/v1/rpc/')){
  const args=JSON.parse(init.body);calls.push({name:url.pathname.split('/').at(-1),args});
  if(rpcError)return Response.json({message:rpcError,code:'P0001'},{status:400});
  if(url.pathname.endsWith('delete_comment_with_replies'))return new Response(null,{status:204});
  return Response.json({id:args.p_id,storyId:args.p_story_id,authorId:args.p_actor,content:args.p_content,replyToId:args.p_reply_to_id,replyRootId:'root-legacy',reportsCount:99});
 }
 throw new Error(`Unexpected mock request ${url.pathname}`);
};
const {default:app}=await import('../backend/app.ts');let server,url;
before(async()=>{server=app.listen(0,'127.0.0.1');await once(server,'listening');url=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{await new Promise(r=>server.close(r));globalThis.fetch=originalFetch;});
const request=(body,method='POST',path='/api/comments',auth=true)=>fetch(url+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer valid'}:{})},body:JSON.stringify(body)});
test('reply create requires auth and ignores no server authority',async()=>{
 const unauth=await request({id,storyId:'story-1',content:'hello'},'POST','/api/comments',false);assert.equal(unauth.status,401);
 const spoof=await request({id,storyId:'story-1',content:'hello',recipientId:owner});assert.equal(spoof.status,400);
});
test('reply create passes verified actor and direct legacy target into atomic RPC',async()=>{
 calls.length=0;const res=await request({id,storyId:'story-1',content:'hello',replyToId:'legacy-parent'});assert.equal(res.status,201);
 assert.deepEqual(calls[0],{name:'save_comment_with_reply',args:{p_id:id,p_story_id:'story-1',p_actor:owner,p_content:'검사한 댓글',p_reply_to_id:'legacy-parent'}});
 assert.equal('reportsCount' in (await res.json()).comment,false);
});
test('retry with changed direct parent conflicts without provider or RPC',async()=>{
 rows.set(id,{id,storyId:'story-1',authorId:owner,replyToId:'parent-A'});const before=providerCalls;calls.length=0;
 const res=await request({id,storyId:'story-1',content:'hello',replyToId:'parent-B'});assert.equal(res.status,409);assert.equal(providerCalls,before);assert.equal(calls.length,0);rows.clear();
});
test('database missing/private parent error fails closed with no direct-insert fallback',async()=>{
 rpcError='REPLY_TARGET_NOT_FOUND';try{const res=await request({id,storyId:'story-1',content:'hello',replyToId:'other-story-parent'});assert.equal(res.status,404);}finally{rpcError=null;}
});
test('soft delete uses verified actor and accepts legacy comment ID',async()=>{
 calls.length=0;const res=await request({storyId:'story-1'},'DELETE','/api/comments/legacy-comment');assert.deepEqual(await res.json(),{deleted:true});assert.deepEqual(calls[0].args,{p_id:'legacy-comment',p_story_id:'story-1',p_actor:owner});
});
test('reply and soft delete reject when draft is disabled',async()=>{
 process.env.NOTIFICATIONS_REPLIES_ENABLED='false';try{
  let res=await request({id,storyId:'story-1',content:'hello',replyToId:'parent'});assert.equal(res.status,404);
  res=await request({storyId:'story-1'},'DELETE','/api/comments/legacy-comment');assert.equal(res.status,404);
 }finally{process.env.NOTIFICATIONS_REPLIES_ENABLED='true';}
});
