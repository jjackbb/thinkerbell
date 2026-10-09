import test from 'node:test';
import assert from 'node:assert/strict';
import { ownsStory, deleteOwnedStory } from '../frontend/src/lib/storyOwnership.ts';
const fixture = ({sessionId='owner', token='synthetic', data={id:'story'}, error=null, sessionError=null, onSession=()=>{}, onDelete=()=>{}}={}) => {
  const calls=[];
  const query={eq:(...args)=>{calls.push(args);return query;},select:()=>query,maybeSingle:async()=>{onDelete();return {data,error};}};
  const client={auth:{getSession:async()=>{onSession();return {data:{session:sessionId ? {user:{id:sessionId},access_token:token}:null},error:sessionError};}},from:table=>{calls.push(table);return {delete:()=>query};}};
  return {client,calls};
};
test('guest, absent, empty and mismatched identifiers never authorize owner controls',()=>{
 for(const [user,author,guest] of [[undefined,undefined,false],[null,null,false],['','',false],[' ',' ',false],['owner','owner',true],['other','owner',false]]) assert.equal(ownsStory(user,author,guest),false);
 assert.equal(ownsStory('owner','owner'),true);
});
test('guest, stale session and failed session lookup issue no delete',async()=>{
 for(const opts of [{sessionId:null},{sessionId:'other'},{token:''},{sessionError:new Error('expired')}]){
  const f=fixture(opts);await assert.rejects(deleteOwnedStory(f.client,'story','owner',()=>true));assert.deepEqual(f.calls,[]);
 }
});
test('account switch during session lookup cannot dispatch a deletion',async()=>{
 let current=true;const f=fixture({onSession:()=>{current=false;}});
 await assert.rejects(deleteOwnedStory(f.client,'story','owner',()=>current));assert.deepEqual(f.calls,[]);
});
test('owner deletion carries both filters and requires confirmed target row',async()=>{
 const f=fixture();await deleteOwnedStory(f.client,'story','owner',()=>true);
 assert.deepEqual(f.calls,['stories',['id','story'],['authorId','owner']]);
 for(const opts of [{data:null},{data:{id:'other'}},{error:new Error('denied')}]) await assert.rejects(deleteOwnedStory(fixture(opts).client,'story','owner',()=>true));
});
test('late deletion result after account transition cannot report success',async()=>{
 let current=true;const f=fixture({onDelete:()=>{current=false;}});
 await assert.rejects(deleteOwnedStory(f.client,'story','owner',()=>current),/ACCOUNT_CHANGED/);
});
