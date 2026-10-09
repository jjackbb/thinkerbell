import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';

const base = process.env.DELETE_TEST_REST_URL;
const secret = process.env.DELETE_TEST_JWT_SECRET;
if (!base || !secret) throw new Error('Set DELETE_TEST_REST_URL and DELETE_TEST_JWT_SECRET for the isolated PostgREST test');
const url = new URL(base);
if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
  throw new Error('Delete REST test only accepts a localhost URL');
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

test('real isolated REST enforces anonymous, invalid token, other account and owner deletion', async () => {
  const ids=['ordinary','private','hidden','blind','missing-author','empty-author'];
  const owner=userIds.author;
  for(const id of ids) {
    const path=`/stories?id=eq.${id}`;
    const anonymous=await request(path,null,'DELETE');
    assert.equal(anonymous.status,204);
    for(const other of [userIds.first,userIds.second]) assert.equal((await request(path,other,'DELETE')).status,204);
    const invalid=await fetch(new URL(path,url),{method:'DELETE',headers:{Authorization:'Bearer invalid'}});
    assert.equal(invalid.status,401);
    const preserved=await request(path,owner);
    assert.equal(preserved.status,200);
    assert.equal(preserved.data.length,1,`${id} must survive unauthorized requests`);
  }
  for(const id of ['ordinary','private','hidden','blind']) {
    assert.equal((await request(`/stories?id=eq.${id}`,owner,'DELETE')).status,204);
    assert.equal((await request(`/stories?id=eq.${id}`,owner)).data.length,0);
  }
  for(const id of ['missing-author','empty-author']) {
    await request(`/stories?id=eq.${id}`,owner,'DELETE');
    assert.equal((await request(`/stories?id=eq.${id}`,owner)).data.length,1);
  }
});
