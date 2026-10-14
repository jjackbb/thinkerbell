import test from 'node:test';
import assert from 'node:assert/strict';
import {createBudgetedGemini, geminiChatMessages, geminiSelected} from '../backend/providers/runtime.ts';
const env={AI_PROVIDER:'gemini', GEMINI_RUNTIME_ENABLED:'true', GEMINI_PAID_PROJECT_VERIFIED:'true', GEMINI_PRIVACY_READY:'true', GEMINI_BUDGET_READY:'true', ADULT_ELIGIBILITY_READY:'true', GEMINI_API_KEY:'synthetic'};
const req={task:'chat',system:'safe',messages:[{role:'user',text:'hello'}]};
function harness(overrides={}) {
 const calls=[]; const budget={reserve:async()=>{calls.push('reserve');return {allowed:true,reason:'reserved'};},markDispatched:async()=>{calls.push('dispatch');return true;},settle:async()=>{calls.push('settle');},retainUnknown:async()=>{calls.push('unknown');},releaseBeforeDispatch:async()=>{calls.push('release');},...overrides.budget};
 const provider=createBudgetedGemini({userId:'owner',env:{...env,...overrides.env},requireAdultEligibility:async()=>{calls.push('adult');if(overrides.noAdult)throw Error('ineligible');},budget,fetch:async()=>{calls.push('fetch');if(overrides.transportFailure)throw Error('synthetic');return Response.json({candidates:[{content:{role:'model',parts:[{text:'answer'}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:2,candidatesTokenCount:1,thoughtsTokenCount:0,totalTokenCount:3}});}});
 return {calls,provider};
}
for (const flag of ['GEMINI_RUNTIME_ENABLED','GEMINI_PAID_PROJECT_VERIFIED','GEMINI_PRIVACY_READY','GEMINI_BUDGET_READY','ADULT_ELIGIBILITY_READY','GEMINI_API_KEY']) test(`missing ${flag} blocks transport and reservation`,async()=>{const h=harness({env:{[flag]:''}});await assert.rejects(h.provider.generateText(req));assert.deepEqual(h.calls,[]);});
test('adult check precedes reserve and dispatch; settlement follows transport',async()=>{const h=harness();assert.equal((await h.provider.generateText(req)).text,'answer');assert.deepEqual(h.calls,['adult','reserve','dispatch','fetch','settle']);});
test('ineligible user never reserves or sends',async()=>{const h=harness({noAdult:true});await assert.rejects(h.provider.generateText(req));assert.deepEqual(h.calls,['adult']);});
test('denied budget never dispatches',async()=>{const h=harness({budget:{reserve:async()=>({allowed:false,reason:'cap'})}});await assert.rejects(h.provider.generateText(req));assert.deepEqual(h.calls,['adult']);});
test('invalid input releases only undispatched reservation',async()=>{const h=harness();await assert.rejects(h.provider.generateText({...req,messages:[]}));assert.deepEqual(h.calls,['adult','reserve','release']);});
test('transport failure retains reservation; no retry or fallback',async()=>{const h=harness({transportFailure:true});await assert.rejects(h.provider.generateText(req));assert.deepEqual(h.calls,['adult','reserve','dispatch','fetch','unknown']);});
test('ambiguous dispatch failure retains hold without transport',async()=>{const h=harness({budget:{markDispatched:async()=>{throw Error('db failure');}}});await assert.rejects(h.provider.generateText(req));assert.deepEqual(h.calls,['adult','reserve','unknown']);});
test('settlement failure retains cost and never returns success',async()=>{const h=harness({budget:{settle:async()=>{throw Error('db failure');}}});await assert.rejects(h.provider.generateText(req));assert.deepEqual(h.calls,['adult','reserve','dispatch','fetch','unknown']);});
test('unknown provider fails closed and default stays Potens',()=>{assert.equal(geminiSelected({}),false);assert.throws(()=>geminiSelected({AI_PROVIDER:'typo'}));});
test('history keeps paired chronological exchanges and final user exactly once',()=>{const history=[{sender:'ai',text:'orphan'},{sender:'user',text:'old'},{sender:'user',text:'new'},{sender:'ai',text:'reply'},{sender:'user',text:'pending'}];assert.deepEqual(geminiChatMessages(history,'now','system'),[{role:'user',text:'new'},{role:'assistant',text:'reply'},{role:'user',text:'now'}]);});
