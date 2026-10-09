import test from 'node:test';
import assert from 'node:assert/strict';
import { createSignupLandingGate, createdSignupUser, finishCreatedSignup, signupLandingHref, landingCtaHref } from '../frontend/src/lib/signupLanding.ts';
const accountA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const accountB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}};

test('existing login, duplicate signup, incomplete and ambiguous responses never introduce a user',()=>{
 for(const response of [null,{}, {created:false,userId:accountA},{created:true}, {created:true,userId:''},{status:'registered'},{status:'pending'}, {user:{id:accountA},session:{}}]) assert.equal(createdSignupUser(response),null);
 assert.equal(createdSignupUser({created:true,userId:accountA}),accountA);
});
test('refresh, relogin and retried callback cannot reopen a shown account introduction',()=>{
 const saved=storage();const gate=createSignupLandingGate(()=>saved);
 assert.equal(gate(accountA,accountA),true);
 assert.equal(gate(accountA,accountA),false);
 const restored=createSignupLandingGate(()=>saved);
 assert.equal(restored(accountA,accountA),false);
 assert.equal(restored(accountB,accountB),true);
 assert.equal(restored(accountA,null),false);
});
test('account switch cannot claim another account introduction or mark it seen',()=>{
 const gate=createSignupLandingGate(()=>storage());
 assert.equal(gate(accountA,accountB),false);
 assert.equal(gate(accountA,accountA),true);
});
test('verified creation presents once after automatic login succeeds',async()=>{
 const order=[];await finishCreatedSignup(accountA,async()=>{order.push('login');return true},id=>order.push(id));
 assert.deepEqual(order,['login',accountA]);
});
test('automatic login error is independent from a successfully created account',async()=>{
 for(const login of [async()=>false,async()=>{throw Error('network')}]){
  const shown=[];assert.equal(await finishCreatedSignup(accountA,login,id=>shown.push(id)),false);
  assert.deepEqual(shown,[accountA]);
 }
});
test('aborted signup or switching account during async work prevents late introduction',async()=>{
 let active=false,calls=0;const shown=[];
 await finishCreatedSignup(accountA,async()=>{calls++;return true},id=>shown.push(id),()=>active);
 assert.equal(calls,0);assert.deepEqual(shown,[]);
 active=true;await finishCreatedSignup(accountA,async()=>{calls++;active=false;return true},id=>shown.push(id),()=>active);
 assert.equal(calls,1);assert.deepEqual(shown,[]);
});
test('blocked browser storage still deduplicates the current signup attempt',()=>{
 const gate=createSignupLandingGate(()=>{throw Error('blocked storage')});
 assert.equal(gate(accountA,null),true);assert.equal(gate(accountA,null),false);
});

test('navigation preserves fixed technical/recruitment categories without arbitrary query data',()=>{
 assert.equal(signupLandingHref('qa'),'/landing?source=qa');
 assert.equal(landingCtaHref('write','qa'),'/?action=write&source=qa');
 assert.equal(landingCtaHref('browse','community'),'/?browse=1&source=community');
 assert.equal(signupLandingHref('private@example.invalid'),'/landing');
 assert.equal(landingCtaHref('write','token=secret'),'/?action=write');
});
