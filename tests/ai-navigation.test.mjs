import test from 'node:test';
import assert from 'node:assert/strict';
import { canContinueAiNavigation, readAiReturnStory } from '../frontend/src/lib/aiNavigation.ts';
const story={id:'synthetic-story',authorId:'owner',visibility:'public'};
const base={generation:2,currentGeneration:2,account:'reader',currentAccount:'reader',storyId:story.id,stories:[story],hiddenStoriesReady:true,hiddenStoryIds:[]};
test('a late quota response cannot reopen a cancelled selection or previous account',()=>{
 assert.equal(canContinueAiNavigation(base),true);
 assert.equal(canContinueAiNavigation({...base,currentGeneration:3}),false);
 assert.equal(canContinueAiNavigation({...base,currentAccount:'other'}),false);
 assert.equal(canContinueAiNavigation({...base,currentAccount:null}),false);
});
test('deleted, newly private, hidden, blind and adult sources invalidate pending navigation',()=>{
 assert.equal(canContinueAiNavigation({...base,stories:[]}),false);
 for(const patch of [{visibility:'private'},{isHidden:true},{isBlind:true},{isAdult:true}]) assert.equal(canContinueAiNavigation({...base,stories:[{...story,...patch}]}),false);
 assert.equal(canContinueAiNavigation({...base,hiddenStoryIds:[story.id]}),false);
 assert.equal(canContinueAiNavigation({...base,hiddenStoriesReady:false}),false);
 assert.equal(canContinueAiNavigation({...base,account:'owner',currentAccount:'owner',stories:[{...story,visibility:'private'}]}),true);
});

const origin={generation:2,account:'reader',storyId:story.id};
const snapshot=()=>({generation:2,account:'reader',stories:[story],hiddenStoriesReady:true,hiddenStoryIds:[]});
test('return reads fresh access and permits a same-account same-story result',async()=>{
 const fresh={...story,title:'updated'};
 assert.deepEqual(await readAiReturnStory(origin,snapshot,async()=>({data:fresh,error:null})),{status:'ready',story:fresh});
});
test('return cannot reveal missing, mismatched, restricted or failed reads',async()=>{
 for(const data of [null,{...story,id:'different'},{...story,visibility:'private'},{...story,isBlind:true},{...story,isAdult:true},{...story,isHidden:true}]) {
  assert.deepEqual(await readAiReturnStory(origin,snapshot,async()=>({data,error:null})),{status:'unavailable'});
 }
 assert.deepEqual(await readAiReturnStory(origin,snapshot,async()=>{throw Error('unavailable');}),{status:'unavailable'});
 const own={...origin,account:'owner'};
 assert.equal((await readAiReturnStory(own,()=>({...snapshot(),account:'owner'}),async()=>({data:{...story,visibility:'private'},error:null}))).status,'ready');
});
test('late return cannot reopen after logout, account change or another navigation',async()=>{
 for(const patch of [{account:null},{account:'other'},{generation:3}]){
  let current=snapshot(),release;
  const waiting=readAiReturnStory(origin,()=>current,()=>new Promise(resolve=>{release=resolve;}));
  current={...current,...patch};release({data:story,error:null});
  assert.deepEqual(await waiting,{status:'stale'});
 }
});
test('deletion, personal hiding and lost access while reading invalidate retained input',async()=>{
 for(const patch of [{stories:[]},{hiddenStoryIds:[story.id]},{hiddenStoriesReady:false},{stories:[{...story,visibility:'private'}]}]){
  let current=snapshot(),release;
  const waiting=readAiReturnStory(origin,()=>current,()=>new Promise(resolve=>{release=resolve;}));
  current={...current,...patch};release({data:story,error:null});
  assert.deepEqual(await waiting,{status:'unavailable'});
 }
});
test('repeated return only grants authority to the latest request, including late failures',async()=>{
 let current=snapshot(),release;
 const first=readAiReturnStory(origin,()=>current,()=>new Promise(resolve=>{release=resolve;}));
 current={...current,generation:3};
 const second=await readAiReturnStory({...origin,generation:3},()=>current,async()=>({data:story,error:null}));
 release({data:null,error:true});
 assert.equal(second.status,'ready');assert.deepEqual(await first,{status:'stale'});
});
