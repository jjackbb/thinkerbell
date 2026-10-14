import test from 'node:test';
import assert from 'node:assert/strict';
import { costNano, reservationNano, parseUsage, kstMonth, createProviderBudgetGuard } from '../backend/providerBudget.ts';
test('integer nanodollars include thinking at output rate',()=> {
 assert.equal(costNano(1_000_000,1_000_000),1_750_000_000);
 assert.equal(reservationNano(1_048_576,2048),265_216_000);
 assert.deepEqual(parseUsage({promptTokenCount:100,candidatesTokenCount:20,thoughtsTokenCount:30,totalTokenCount:150}),{inputTokens:100,outputTokens:50});
});
test('bad, missing, inconsistent and non-text usage fails closed',()=> {
 for(const raw of [null,{}, {promptTokenCount:1,candidatesTokenCount:1,totalTokenCount:2}, {promptTokenCount:1,candidatesTokenCount:1,thoughtsTokenCount:0,totalTokenCount:3},{promptTokenCount:1,candidatesTokenCount:1,thoughtsTokenCount:0,totalTokenCount:2,toolUsePromptTokenCount:1},{promptTokenCount:1,candidatesTokenCount:1,thoughtsTokenCount:0,totalTokenCount:2,promptTokensDetails:[{modality:'IMAGE',tokenCount:1}]}]) assert.throws(()=>parseUsage(raw));
 for(const n of [-1,Infinity,NaN,1.2,'1',null,1e10]) assert.throws(()=>costNano(n,1));
 assert.throws(()=>reservationNano(1,65537));
});
test('KST month boundary is service calendar, independent from client timezone',()=> {
 assert.equal(kstMonth(new Date('2026-10-31T14:59:59.999Z')),'2026-10-01');
 assert.equal(kstMonth(new Date('2026-10-31T15:00:00Z')),'2026-11-01');
});
test('RPC failures and malformed responses cannot authorize dispatch',async()=> {
 for(const data of [null,{},'true',{allowed:'true',reason:'ok'}]) {
  const guard=createProviderBudgetGuard(async()=>({data,error:null}));
  await assert.rejects(()=>guard.reserve({attemptId:'x',inputUpperBound:1,outputUpperBound:1}));
  await assert.rejects(()=>guard.markDispatched('x'));
 }
 const guard=createProviderBudgetGuard(async()=>({data:true,error:new Error('offline')}));
 await assert.rejects(()=>guard.markDispatched('x'));
});
test('missing usage records unknown and never releases',async()=> {
 const calls=[]; const guard=createProviderBudgetGuard(async(name,args)=>{calls.push({name,args}); return {data:null,error:null};});
 await assert.rejects(()=>guard.settle('x',{}));
 assert.deepEqual(calls.map(c=>c.name),['provider_budget_unknown']);
});
