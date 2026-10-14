import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
const localFetch=globalThis.fetch, owner='11111111-1111-4111-8111-111111111111';
const events=[];let eligible=true,allow=true,existingComment=false,anonymous=false;
const story={id:'story-existing',authorId:owner,visibility:'public'};
Object.assign(process.env,{SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'synthetic',SUPABASE_SECRET_KEY:'synthetic',AI_PROVIDER:'gemini',GEMINI_API_KEY:'synthetic',GEMINI_RUNTIME_ENABLED:'true',GEMINI_PAID_PROJECT_VERIFIED:'true',GEMINI_PRIVACY_READY:'true',GEMINI_BUDGET_READY:'true',ADULT_ELIGIBILITY_READY:'true'});
globalThis.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input.url),method=init?.method||'GET';
 if(url.hostname==='generativelanguage.googleapis.com'){
  events.push('provider');const body=JSON.parse(init.body);const structured=body.generationConfig.responseJsonSchema;
  const text=structured?.required.includes('isAdult')?JSON.stringify({isAdult:false,hasProfanity:false,sanitizedTitle:'제목',sanitizedText:'가'.repeat(25),issueMySide:'내편',issueYourSide:'상대편'}):structured?JSON.stringify({sanitizedText:'댓글'}):'답변';
  const result={candidates:[{content:{role:'model',parts:[{text}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:10,thoughtsTokenCount:0,totalTokenCount:20}};
  return url.searchParams.has('alt')?new Response('data: '+JSON.stringify(result)+'\n\n',{headers:{'content-type':'text/event-stream'}}):Response.json(result);
 }
 if(url.hostname!=='example.supabase.co')throw Error('NETWORK_FORBIDDEN');
 if(url.pathname==='/auth/v1/user')return Response.json({id:owner,is_anonymous:anonymous,user_metadata:{},app_metadata:{}});
 const body=init?.body?JSON.parse(init.body):{};
 if(url.pathname.includes('/rpc/')){
  const name=url.pathname.split('/').at(-1);events.push(name);
  if(name==='read_adult_eligibility')return Response.json(eligible?{policy_version:'adult-self-attestation-v1',attested_at:'2020-01-01T00:00:00Z'}:null);
  if(name==='provider_budget_reserve')return Response.json({allowed:allow,reason:allow?'reserved':'cap'});
  if(name==='provider_budget_dispatch')return Response.json(true);
  if(name==='provider_budget_settle')return Response.json({settled:true});
  throw Error(name);
 }
 if(url.pathname==='/rest/v1/ai_personas')return Response.json([{id:'room',userId:owner,storyId:'story-existing',systemInstruction:'safe',chatHistory:[],createdAt:'2020-01-01T00:00:00Z'}]);
 if(url.pathname==='/rest/v1/stories'){
  if(method==='GET')return Response.json(url.searchParams.get('id')==='eq.story-existing'?[story]:[]);
  events.push('write');return Response.json(method==='POST'?body:[{...story,...body}]);
 }
 if(url.pathname==='/rest/v1/comments'){
  if(method==='GET')return Response.json(existingComment?[{id:'comment-existing',authorId:owner,storyId:story.id}]:[]);
  events.push('write');return Response.json(method==='POST'?body:[{id:'comment-existing',...body}]);
 }
 throw Error(url.pathname);
};
const {default:app}=await import('../backend/app.ts');let server,base;
before(async()=>{server=app.listen(0,'127.0.0.1');await once(server,'listening');base='http://127.0.0.1:'+server.address().port;});
after(async()=>{await new Promise(r=>server.close(r));globalThis.fetch=localFetch;});
const storyBody={requestId:'story-11111111-1111-4111-8111-111111111111',title:'제목',body:'가'.repeat(25),category:'직장'};
const cases=[['POST','/api/stories',storyBody],['PUT','/api/stories/story-existing',storyBody],['POST','/api/comments',{id:'comment-11111111-1111-4111-8111-111111111111',storyId:story.id,content:'댓글'}],['PUT','/api/comments/comment-existing',{storyId:story.id,content:'댓글'}],['POST','/api/chat-stream',{personaId:'room',prompt:'질문'}]];
for(const [method,path,body] of cases) test(`${method} ${path} reserves before Gemini; age and cap block`,async()=>{
 existingComment=method==='PUT'&&path.includes('comments');
 const send=()=>localFetch(base+path,{method,headers:{'content-type':'application/json',authorization:'Bearer synthetic'},body:JSON.stringify(body)});
 eligible=false;events.length=0;let r=await send();assert.equal(r.status,403);assert(!events.includes('provider'));assert(!events.includes('provider_budget_reserve'));
 eligible=true;allow=false;events.length=0;r=await send();const rejected=await r.text();assert(!events.includes('provider'));assert(!events.includes('write'));assert(path.includes('chat-stream')?rejected.includes('ai_provider_failed'):r.status===429);
 allow=true;events.length=0;r=await send();const response=await r.text();assert(r.ok,response);assert(events.indexOf('provider_budget_reserve')<events.indexOf('provider_budget_dispatch'));assert(events.indexOf('provider_budget_dispatch')<events.indexOf('provider'));assert(events.indexOf('provider')<events.indexOf('provider_budget_settle'));assert.equal(events.filter(e=>e==='provider').length,1);
});
test('Potens is also age gated when eligibility flag is enabled',async()=>{process.env.AI_PROVIDER='potens';eligible=false;events.length=0;const r=await localFetch(base+'/api/stories',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer synthetic'},body:JSON.stringify(storyBody)});assert.equal(r.status,403);assert(!events.includes('provider_budget_reserve'));process.env.AI_PROVIDER='gemini';});

test('anonymous auth cannot attest or send paid requests',async()=>{anonymous=true;events.length=0;for(const path of ['/api/account/adult-eligibility','/api/stories']) {const r=await localFetch(base+path,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer anonymous'},body:JSON.stringify(storyBody)});assert.equal(r.status,401);}assert.deepEqual(events,[]);anonymous=false;});
