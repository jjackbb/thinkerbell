import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';

const base = process.env.CONTENT_TEST_REST_URL;
const secret = process.env.CONTENT_TEST_JWT_SECRET;
if (!base || !secret) throw new Error('Set CONTENT_TEST_REST_URL and CONTENT_TEST_JWT_SECRET for the isolated PostgREST test');
const url = new URL(base);
if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
  throw new Error('Content boundary REST test only accepts a localhost URL');
}

const userIds = {
  author: '11111111-1111-1111-1111-111111111111',
  first: '22222222-2222-2222-2222-222222222222',
  second: '33333333-3333-3333-3333-333333333333',
};

function jwt(userId) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const content = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    role: 'authenticated', sub: userId, exp: Math.floor(Date.now() / 1000) + 600,
  })}`;
  const signature = createHmac('sha256', secret).update(content).digest('base64url');
  return `${content}.${signature}`;
}

async function request(path, userId, method = 'GET', body) {
  const response = await fetch(new URL(path, url), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { Authorization: `Bearer ${jwt(userId)}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : null };
}

test('projected REST exposes no private fields, blind comments, future columns or unauthorized deletes',async()=>{
 const owner=userIds.author;
 const anon=await request('/rpc/read_visible_stories',null,'POST',{});
 assert.equal(anon.status,200);
 assert.deepEqual(anon.data.map(s=>s.id).sort(),['foreign','missing-author','ordinary']);
 for(const row of anon.data) for(const key of ['personaInstruction','appealText','appealedAt','appealStatus','reportsCount','future_secret']) assert.equal(Object.hasOwn(row,key),false,key);
 const own=await request('/rpc/read_visible_stories',owner,'POST',{});
 assert.equal(own.status,200);
 assert.equal(own.data.find(s=>s.id==='private').personaInstruction,'owner-secret');
 assert.equal(Object.hasOwn(own.data.find(s=>s.id==='foreign'),'personaInstruction'),false);
 assert.equal(Object.hasOwn(own.data[0],'future_secret'),false);
 for(const account of [null,owner,userIds.first]) {
  for(const path of ['/stories?select=*','/comments?select=*','/stories?select=personaInstruction','/comments?select=content']) assert.ok([401,403].includes((await request(path,account)).status),path);
  const comments=await request('/rpc/read_visible_comments',account,'POST',{});
  assert.equal(comments.status,200);
  assert.equal(comments.data.some(c=>c.id==='blind-comment'),false);
  assert.equal(comments.data.some(c=>c.id==='private-comment'),account===owner);
  assert.ok(comments.data.every(c=>!Object.hasOwn(c,'future_secret')&&!Object.hasOwn(c,'reportsCount')));
 }
 const invalid=await fetch(new URL('/rpc/read_visible_stories',url),{method:'POST',headers:{Authorization:'Bearer invalid','Content-Type':'application/json'},body:'{}'});
 assert.equal(invalid.status,401);
 // Mutation RPCs are HTTP data endpoints too, not an exception to field minimization.
 const voted=await request('/rpc/vote_story',userIds.first,'POST',{p_story_id:'ordinary',p_option:'A'});
 assert.equal(voted.status,200,JSON.stringify(voted));assert.equal(voted.data.votesA,1);
 for(const field of ['personaInstruction','appealText','reportsCount','future_secret']) assert.equal(Object.hasOwn(voted.data,field),false);
 const replay=await request('/rpc/vote_story',userIds.first,'POST',{p_story_id:'ordinary',p_option:'A'});
 assert.equal(replay.data.votesA,1);
 const liked=await request('/rpc/like_comment',userIds.first,'POST',{p_comment_id:'normal',p_delta:1});
 assert.equal(liked.status,200,JSON.stringify(liked));assert.equal(liked.data.likeCount,1);
 assert.equal(Object.hasOwn(liked.data,'future_secret'),false);
 assert.equal(Object.hasOwn(liked.data,'reportsCount'),false);
 const hidden=await request('/rpc/set_story_visibility',owner,'POST',{p_story_id:'ordinary',p_visibility:'private'});
 assert.equal(hidden.status,200,JSON.stringify(hidden));assert.equal(hidden.data.visibility,'private');
 assert.equal(hidden.data.personaInstruction,'owner-secret');assert.equal(Object.hasOwn(hidden.data,'future_secret'),false);
 assert.equal((await request('/rpc/read_visible_stories',userIds.first,'POST',{p_story_id:'ordinary'})).data.length,0);
 assert.ok((await request('/rpc/vote_story',userIds.first,'POST',{p_story_id:'ordinary',p_option:'B'})).status>=400);
 const restored=await request('/rpc/set_story_visibility',owner,'POST',{p_story_id:'ordinary',p_visibility:'public'});assert.equal(restored.status,200);
 for(const [name,args] of [['vote_story_boundary_internal',{p_story_id:'ordinary',p_option:'A'}],['like_comment_boundary_internal',{p_comment_id:'normal',p_delta:1}],['set_story_visibility_boundary_internal',{p_story_id:'ordinary',p_visibility:'private'}],['leaky_legacy_row',{p_story_id:'ordinary'}]]){
  assert.ok([401,403].includes((await request(`/rpc/${name}`,userIds.first,'POST',args)).status),name);
 }
 // PostgREST returns only RETURNING id, matching the current application's owner-delete contract.
 const del=async(path,account)=>{
  const res=await fetch(new URL(path,url),{method:'DELETE',headers:{Authorization:`Bearer ${jwt(account)}`,Prefer:'return=representation'}});
  return {status:res.status,data:await res.json()};
 };
 assert.deepEqual((await del('/stories?id=eq.ordinary&select=id',userIds.first)).data,[]);
 assert.deepEqual((await del('/comments?id=eq.normal&select=id',userIds.first)).data,[]);
 const blind=await del('/comments?id=eq.blind-comment&select=id',owner);
 assert.equal(blind.status,200);assert.deepEqual(blind.data,[{id:'blind-comment'}]);
 const comment=await del('/comments?id=eq.normal&select=id',owner);
 assert.equal(comment.status,200);assert.deepEqual(comment.data,[{id:'normal'}]);
 for(const id of ['ordinary','private','hidden','blind','adult']){
  const removed=await del(`/stories?id=eq.${id}&select=id`,owner);
  assert.equal(removed.status,200,JSON.stringify(removed));assert.deepEqual(removed.data,[{id}]);
 }
 assert.deepEqual((await del('/stories?id=eq.missing-author&select=id',owner)).data,[]);
 const signals=await request('/story_access_invalidations',null);
 assert.equal(signals.status,200);
 assert.ok(signals.data.some(s=>s.access_changed===true));
 assert.ok(signals.data.every(s=>Object.keys(s).sort().join(',')==='access_changed,changed_at,id,story_id'));
});
